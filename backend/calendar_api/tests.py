from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .integrations import build_contact_birthday_external_uid, compute_next_birthday_occurrence
from .models import BIRTHDAY_CALENDAR_NAME, Calendar, Event


User = get_user_model()


class CalendarApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sylvain", password="testpass123")
        self.other_user = User.objects.create_user(username="alice", password="testpass123")
        self.admin_user = User.objects.create_user(
            username="contact-sync",
            password="testpass123",
            is_staff=True,
            is_superuser=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_calendars_list_auto_creates_birthday_calendar_once(self):
        response = self.client.get("/api/calendars/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Calendar.objects.filter(owner=self.user, kind=Calendar.Kind.BIRTHDAYS).count(), 1)
        self.assertEqual(response.data[0]["name"], BIRTHDAY_CALENDAR_NAME)
        self.assertEqual(response.data[0]["kind"], Calendar.Kind.BIRTHDAYS)

        second_response = self.client.get("/api/calendars/")
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Calendar.objects.filter(owner=self.user, kind=Calendar.Kind.BIRTHDAYS).count(), 1)

    def test_named_existing_anniversary_calendar_is_promoted_to_birthday_kind(self):
        Calendar.objects.create(
            owner=self.user,
            name="Anniverssaire",
            color="#123456",
            is_default=False,
            kind=Calendar.Kind.PERSONAL,
        )

        response = self.client.get("/api/calendars/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        calendar = Calendar.objects.get(owner=self.user, name="Anniverssaire")
        self.assertEqual(calendar.kind, Calendar.Kind.BIRTHDAYS)
        self.assertEqual(Calendar.objects.filter(owner=self.user, kind=Calendar.Kind.BIRTHDAYS).count(), 1)

    def test_events_list_exposes_explicit_kind_from_calendar_type(self):
        birthday_calendar = Calendar.objects.create(
            owner=self.user,
            name="Anniverssaire",
            color="#d81b60",
            is_default=False,
            kind=Calendar.Kind.PERSONAL,
        )
        personal_calendar = Calendar.objects.create(
            owner=self.user,
            name="Maison",
            color="#1976d2",
            is_default=True,
            kind=Calendar.Kind.PERSONAL,
        )
        now = timezone.now()
        birthday_event = Event.objects.create(
            calendar=birthday_calendar,
            title="Anniversaire de Marie",
            start=now + timedelta(days=1),
            end=now + timedelta(days=1, hours=1),
            all_day=False,
        )
        personal_event = Event.objects.create(
            calendar=personal_calendar,
            title="Réunion",
            start=now + timedelta(days=2),
            end=now + timedelta(days=2, hours=1),
            all_day=False,
        )
        Event.objects.create(
            calendar=Calendar.objects.create(
                owner=self.other_user,
                name="Privé",
                color="#444444",
                is_default=False,
                kind=Calendar.Kind.PERSONAL,
            ),
            title="Ne doit pas apparaître",
            start=now + timedelta(days=3),
            end=now + timedelta(days=3, hours=1),
            all_day=False,
        )

        response = self.client.get("/api/events/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kinds_by_id = {item["id"]: item["kind"] for item in response.data}
        self.assertEqual(kinds_by_id[birthday_event.id], "birthday")
        self.assertEqual(kinds_by_id[personal_event.id], "event")

    def test_empty_system_birthday_calendar_is_replaced_by_legacy_calendar_with_events(self):
        empty_system = Calendar.objects.create(
            owner=self.user,
            name=BIRTHDAY_CALENDAR_NAME,
            color="#d81b60",
            is_default=False,
            kind=Calendar.Kind.BIRTHDAYS,
        )
        legacy_calendar = Calendar.objects.create(
            owner=self.user,
            name="Anniverssaire",
            color="#123456",
            is_default=False,
            kind=Calendar.Kind.PERSONAL,
        )
        Event.objects.create(
            calendar=legacy_calendar,
            title="Anniversaire de Luc",
            start=timezone.now() + timedelta(days=7),
            end=timezone.now() + timedelta(days=7, hours=1),
            all_day=False,
        )

        response = self.client.get("/api/calendars/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Calendar.objects.filter(pk=empty_system.pk).exists())
        legacy_calendar.refresh_from_db()
        self.assertEqual(legacy_calendar.kind, Calendar.Kind.BIRTHDAYS)

    def test_contact_birthday_sync_endpoint_upserts_event_for_owner(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            "/api/integrations/contact-birthdays/sync/",
            {
                "owner_username": "sylvain",
                "contact_id": "42",
                "name": "Marie",
                "birthday": "1988-04-12",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = Event.objects.get(external_uid=build_contact_birthday_external_uid("sylvain", "42"))
        self.assertEqual(event.calendar.owner, self.user)
        self.assertEqual(event.calendar.kind, Calendar.Kind.BIRTHDAYS)
        self.assertEqual(event.title, "Marie")
        self.assertTrue(event.all_day)
        self.assertEqual(event.start.date(), compute_next_birthday_occurrence(date(1988, 4, 12)))

    def test_contact_birthday_sync_endpoint_deletes_existing_event_when_payload_is_empty(self):
        birthday_calendar = Calendar.objects.create(
            owner=self.user,
            name=BIRTHDAY_CALENDAR_NAME,
            color="#d81b60",
            is_default=False,
            kind=Calendar.Kind.BIRTHDAYS,
        )
        Event.objects.create(
            calendar=birthday_calendar,
            title="Marie",
            start=timezone.now() + timedelta(days=10),
            end=timezone.now() + timedelta(days=10, hours=1),
            all_day=True,
            external_uid=build_contact_birthday_external_uid("sylvain", "42"),
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            "/api/integrations/contact-birthdays/sync/",
            {
                "owner_username": "sylvain",
                "contact_id": "42",
                "name": "",
                "birthday": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Event.objects.filter(external_uid=build_contact_birthday_external_uid("sylvain", "42")).exists()
        )
