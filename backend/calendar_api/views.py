from datetime import date, datetime, time, timedelta
import hmac
import os

from dateutil.tz import gettz
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from icalendar import Calendar as ICalendar
from rest_framework import parsers, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .contact_integration import ContactIntegrationError, list_contacts
from .integrations import delete_contact_birthday, sync_contact_birthday
from .models import Calendar, Event, ensure_birthday_calendar
from .serializers import CalendarSerializer, DashboardEventsQuerySerializer, EventSerializer


User = get_user_model()

class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import Calendar as Cal, Event as Ev
        if isinstance(obj, Cal):
            return obj.owner == request.user
        if isinstance(obj, Ev):
            return obj.calendar.owner == request.user
        return False

class CalendarViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        ensure_birthday_calendar(self.request.user)
        return Calendar.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        ensure_birthday_calendar(self.request.user)
        return Event.objects.filter(calendar__owner=self.request.user).select_related("calendar")

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        range_start, range_end = _parse_event_window(request)
        payload = _serialize_event_occurrences(
            queryset,
            range_start=range_start,
            range_end=range_end,
            serializer_context=self.get_serializer_context(),
        )
        return Response(payload, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["post"],
        url_path="import-ics",
        parser_classes=[parsers.MultiPartParser, parsers.FormParser],
    )
    def import_ics(self, request):
        calendar_id = request.data.get("calendar_id")
        upload = request.FILES.get("file")

        if not calendar_id:
            return Response({"detail": "calendar_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
        if upload is None:
            return Response({"detail": "Le fichier .ics est requis."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            calendar_id = int(calendar_id)
        except (TypeError, ValueError):
            return Response({"detail": "calendar_id invalide."}, status=status.HTTP_400_BAD_REQUEST)

        calendar = Calendar.objects.filter(pk=calendar_id).select_related("owner").first()
        if calendar is None:
            return Response({"detail": "Calendrier introuvable."}, status=status.HTTP_404_NOT_FOUND)
        if calendar.owner_id != request.user.id:
            return Response(
                {"detail": "Vous ne pouvez pas importer dans ce calendrier."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            parsed = ICalendar.from_ical(upload.read())
        except Exception:
            return Response({"detail": "Fichier .ics invalide."}, status=status.HTTP_400_BAD_REQUEST)

        imported = 0
        skipped = 0

        with transaction.atomic():
            for component in parsed.walk():
                if component.name != "VEVENT":
                    continue

                uid = _clean_ics_text(component.get("UID"), max_length=255) or None
                if uid and Event.objects.filter(calendar=calendar, external_uid=uid).exists():
                    skipped += 1
                    continue

                start_value = _unwrap_ical_value(component.get("DTSTART"))
                end_value = _unwrap_ical_value(component.get("DTEND"))
                if start_value is None:
                    skipped += 1
                    continue

                try:
                    start_dt, end_dt, all_day = _normalize_event_window(start_value, end_value)
                except ValueError:
                    skipped += 1
                    continue

                Event.objects.create(
                    calendar=calendar,
                    title=_clean_ics_text(component.get("SUMMARY"), max_length=200) or "Événement importé",
                    description=_clean_ics_text(component.get("DESCRIPTION")),
                    location=_clean_ics_text(component.get("LOCATION"), max_length=200),
                    external_uid=uid,
                    start=start_dt,
                    end=end_dt,
                    all_day=all_day,
                )
                imported += 1

        return Response({"imported": imported, "skipped": skipped}, status=status.HTTP_200_OK)


class ContactProxyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            contacts = list_contacts(
                owner_username=request.user.username,
                search=request.query_params.get("search", ""),
                visibility=request.query_params.get("visibility", ""),
            )
        except ContactIntegrationError as exc:
            return Response({"detail": str(exc)}, status=exc.status_code)

        return Response(contacts, status=status.HTTP_200_OK)


class WhoAmIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "id": request.user.id,
                "username": request.user.username,
                "email": request.user.email,
                "first_name": request.user.first_name,
                "last_name": request.user.last_name,
            },
            status=status.HTTP_200_OK,
        )


class ContactBirthdaySyncSerializer(serializers.Serializer):
    owner_username = serializers.CharField()
    contact_id = serializers.CharField()
    name = serializers.CharField(required=False, allow_blank=True, default="")
    birthday = serializers.DateField(required=False, allow_null=True, default=None)


CONTACT_SYNC_TOKEN_HEADER = "HTTP_X_INTERNAL_API_TOKEN"


class ContactBirthdaySyncView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        configured_token = str(os.getenv("CALENDRIER_API_TOKEN") or "").strip()
        provided_token = str(request.META.get(CONTACT_SYNC_TOKEN_HEADER) or "").strip()

        if not configured_token:
            return Response(
                {"detail": "CALENDRIER_API_TOKEN est manquant côté Calendrier."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not provided_token or not hmac.compare_digest(provided_token, configured_token):
            return Response({"detail": "Synchronisation Calendrier non autorisée."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ContactBirthdaySyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        owner_username = serializer.validated_data["owner_username"]
        contact_id = serializer.validated_data["contact_id"]
        name = serializer.validated_data.get("name", "").strip()
        birthday = serializer.validated_data.get("birthday")

        if not name or birthday is None:
            deleted_count = delete_contact_birthday(
                owner_username=owner_username,
                contact_id=contact_id,
            )
            return Response({"status": "deleted", "deleted": deleted_count}, status=status.HTTP_200_OK)

        if not User.objects.filter(username=owner_username).exists():
            return Response(
                {"detail": "Utilisateur Calendrier introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        event = sync_contact_birthday(
            owner_username=owner_username,
            contact_id=contact_id,
            name=name,
            birthday=birthday,
        )
        return Response(
            {"status": "synced", "event_id": event.id, "calendar_id": event.calendar_id},
            status=status.HTTP_200_OK,
        )


class DashboardEventsView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        configured_token = str(os.getenv("CALENDRIER_API_TOKEN") or "").strip()
        provided_token = str(request.META.get(CONTACT_SYNC_TOKEN_HEADER) or "").strip()

        if not configured_token:
            return Response(
                {"detail": "CALENDRIER_API_TOKEN est manquant côté Calendrier."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not provided_token or not hmac.compare_digest(provided_token, configured_token):
            return Response({"detail": "Lecture Dashboard Calendrier non autorisée."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DashboardEventsQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        owner_username = serializer.validated_data["owner_username"]
        owner = User.objects.filter(username=owner_username).first()
        if owner is None:
            return Response(
                {"detail": "Utilisateur Calendrier introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ensure_birthday_calendar(owner)
        queryset = Event.objects.filter(calendar__owner=owner).select_related("calendar")
        payload = _serialize_event_occurrences(
            queryset,
            range_start=serializer.validated_data.get("range_start"),
            range_end=serializer.validated_data.get("range_end"),
        )
        return Response(payload, status=status.HTTP_200_OK)


def _unwrap_ical_value(value):
    return getattr(value, "dt", value)


def _clean_ics_text(value, max_length=None):
    if value is None:
        return ""
    text = str(value).strip()
    if max_length is not None:
        return text[:max_length]
    return text


def _make_aware(value):
    default_tz = gettz(settings.TIME_ZONE) or timezone.get_default_timezone()
    if timezone.is_naive(value):
        return timezone.make_aware(value, default_tz)
    return value.astimezone(default_tz)


def _normalize_event_window(start_value, end_value):
    if isinstance(start_value, datetime):
        start_dt = _make_aware(start_value)
        if end_value is None:
            end_dt = start_dt
        elif isinstance(end_value, datetime):
            end_dt = _make_aware(end_value)
        elif isinstance(end_value, date):
            end_dt = _make_aware(datetime.combine(end_value, time(23, 59)))
        else:
            raise ValueError("Type DTEND invalide")

        if end_dt < start_dt:
            end_dt = start_dt
        return start_dt, end_dt, False

    if isinstance(start_value, date):
        start_date = start_value
        if isinstance(end_value, date) and not isinstance(end_value, datetime):
            last_date = end_value - timedelta(days=1)
        else:
            last_date = start_date
        if last_date < start_date:
            last_date = start_date

        start_dt = _make_aware(datetime.combine(start_date, time(0, 1)))
        end_dt = _make_aware(datetime.combine(last_date, time(23, 59)))
        return start_dt, end_dt, True

    raise ValueError("Type DTSTART invalide")


def _parse_event_window(request):
    start_value = request.query_params.get("range_start")
    end_value = request.query_params.get("range_end")

    range_start = _parse_range_value(start_value)
    range_end = _parse_range_value(end_value)

    if range_start and range_end and range_end < range_start:
        range_end = range_start

    return range_start, range_end


def _parse_range_value(value):
    if not value:
        return None

    normalized = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    return _make_aware(parsed)


def _iter_event_occurrences(event, *, range_start=None, range_end=None):
    if event.recurrence != Event.Recurrence.YEARLY:
        if _event_overlaps(event.start, event.end, range_start, range_end):
            yield event.start, event.end
        return

    if range_start is None or range_end is None:
        today = timezone.localdate()
        next_date = _safe_recurrence_date(today.year, event.recurrence_month, event.recurrence_day)
        if next_date < today:
            next_date = _safe_recurrence_date(today.year + 1, event.recurrence_month, event.recurrence_day)
        yield _build_occurrence_window(event, next_date)
        return

    local_tz = gettz(settings.TIME_ZONE) or timezone.get_default_timezone()
    start_local = range_start.astimezone(local_tz)
    end_local = range_end.astimezone(local_tz)

    for year in range(start_local.year - 1, end_local.year + 2):
        occurrence_date = _safe_recurrence_date(year, event.recurrence_month, event.recurrence_day)
        occurrence_start, occurrence_end = _build_occurrence_window(event, occurrence_date)
        if _event_overlaps(occurrence_start, occurrence_end, range_start, range_end):
            yield occurrence_start, occurrence_end


def _build_occurrence_window(event, target_date):
    local_tz = gettz(settings.TIME_ZONE) or timezone.get_default_timezone()
    base_start = event.start.astimezone(local_tz)
    duration = event.end - event.start
    if duration.total_seconds() < 0:
        duration = timedelta(0)

    occurrence_start = timezone.make_aware(
        datetime.combine(
            target_date,
            time(
                base_start.hour,
                base_start.minute,
                base_start.second,
                base_start.microsecond,
            ),
        ),
        local_tz,
    )
    occurrence_end = occurrence_start + duration
    return occurrence_start, occurrence_end


def _safe_recurrence_date(year, month, day):
    if not month or not day:
        raise ValueError("Récurrence annuelle incomplète.")
    try:
        return date(year, month, day)
    except ValueError:
        if month == 2 and day == 29:
            return date(year, 2, 28)
        raise


def _event_overlaps(start_dt, end_dt, range_start, range_end):
    if range_start is not None and end_dt < range_start:
        return False
    if range_end is not None and start_dt > range_end:
        return False
    return True


def _serialize_event_occurrences(queryset, *, range_start=None, range_end=None, serializer_context=None):
    payload = []
    serializer_context = serializer_context or {}
    for event in queryset:
        for occurrence_start, occurrence_end in _iter_event_occurrences(
            event,
            range_start=range_start,
            range_end=range_end,
        ):
            serialized = EventSerializer(event, context=serializer_context).data
            serialized["start"] = occurrence_start.isoformat()
            serialized["end"] = occurrence_end.isoformat()
            payload.append(serialized)

    payload.sort(key=lambda item: item["start"])
    return payload
