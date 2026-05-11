from datetime import date, datetime, time

from dateutil.tz import gettz
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Event, ensure_birthday_calendar


User = get_user_model()


def build_contact_birthday_external_uid(owner_username: str, contact_id: str | int) -> str:
    return f"contact-birthday:{owner_username}:{contact_id}"


def compute_next_birthday_occurrence(birthday: date, *, today: date | None = None) -> date:
    today = today or timezone.localdate()
    candidate = _safe_birthday_date(today.year, birthday.month, birthday.day)
    if candidate < today:
        candidate = _safe_birthday_date(today.year + 1, birthday.month, birthday.day)
    return candidate


def sync_contact_birthday(*, owner_username: str, contact_id: str | int, name: str, birthday: date):
    user = User.objects.filter(username=owner_username).first()
    if user is None:
        raise User.DoesNotExist(owner_username)

    birthday_calendar = ensure_birthday_calendar(user)
    external_uid = build_contact_birthday_external_uid(owner_username, contact_id)
    occurrence = compute_next_birthday_occurrence(birthday)
    start_at, end_at = _build_all_day_window(occurrence)

    event = (
        Event.objects.filter(calendar__owner=user, external_uid=external_uid)
        .select_related("calendar")
        .first()
    )

    if event is None:
        return Event.objects.create(
            calendar=birthday_calendar,
            title=name.strip() or "Anniversaire",
            description="",
            start=start_at,
            end=end_at,
            all_day=True,
            location="",
            external_uid=external_uid,
            recurrence=Event.Recurrence.YEARLY,
            recurrence_month=birthday.month,
            recurrence_day=birthday.day,
        )

    event.calendar = birthday_calendar
    event.title = name.strip() or "Anniversaire"
    event.description = ""
    event.start = start_at
    event.end = end_at
    event.all_day = True
    event.location = ""
    event.external_uid = external_uid
    event.recurrence = Event.Recurrence.YEARLY
    event.recurrence_month = birthday.month
    event.recurrence_day = birthday.day
    event.save()
    return event


def delete_contact_birthday(*, owner_username: str, contact_id: str | int) -> int:
    external_uid = build_contact_birthday_external_uid(owner_username, contact_id)
    deleted_count, _ = Event.objects.filter(
        calendar__owner__username=owner_username,
        external_uid=external_uid,
    ).delete()
    return deleted_count


def _safe_birthday_date(year: int, month: int, day: int) -> date:
    try:
        return date(year, month, day)
    except ValueError:
        if month == 2 and day == 29:
            return date(year, 2, 28)
        raise


def _build_all_day_window(target_date: date):
    local_tz = gettz(settings.TIME_ZONE) or timezone.get_default_timezone()
    start = timezone.make_aware(datetime.combine(target_date, time(0, 1)), local_tz)
    end = timezone.make_aware(datetime.combine(target_date, time(23, 59)), local_tz)
    return start, end
