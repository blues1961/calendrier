from datetime import date, datetime, time, timedelta

from dateutil.tz import gettz
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from icalendar import Calendar as ICalendar
from rest_framework import parsers, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Calendar, Event
from .serializers import CalendarSerializer, EventSerializer

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
        return Calendar.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Event.objects.filter(calendar__owner=self.request.user)

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
