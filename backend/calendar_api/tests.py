from datetime import date, datetime, timedelta
import os
from unittest import mock

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

    def test_event_can_reference_external_contact_snapshot(self):
        personal_calendar = Calendar.objects.create(
            owner=self.user,
            name="Maison",
            color="#1976d2",
            is_default=True,
            kind=Calendar.Kind.PERSONAL,
        )
        now = timezone.now()

        response = self.client.post(
            "/api/events/",
            {
                "calendar": personal_calendar.id,
                "title": "Rendez-vous garage",
                "description": "",
                "start": now.isoformat(),
                "end": (now + timedelta(hours=1)).isoformat(),
                "all_day": False,
                "location": "123 rue Principale",
                "external_contact_id": "42",
                "external_contact_snapshot": {
                    "id": 42,
                    "visibility": "public",
                    "name": "Garage Tremblay",
                    "address": "123 rue Principale",
                    "phone": "555-0101",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["contact"]["name"], "Garage Tremblay")
        self.assertEqual(response.data["contact"]["address"], "123 rue Principale")
        self.assertEqual(response.data["contact"]["phone"], "555-0101")

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
        with mock.patch.dict(os.environ, {"CALENDRIER_API_TOKEN": "shared-secret"}, clear=False):
            response = APIClient().post(
                "/api/integrations/contact-birthdays/sync/",
                {
                    "owner_username": "sylvain",
                    "contact_id": "42",
                    "name": "Marie",
                    "birthday": "1988-04-12",
                },
                format="json",
                HTTP_X_INTERNAL_API_TOKEN="shared-secret",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event = Event.objects.get(external_uid=build_contact_birthday_external_uid("sylvain", "42"))
        self.assertEqual(event.calendar.owner, self.user)
        self.assertEqual(event.calendar.kind, Calendar.Kind.BIRTHDAYS)
        self.assertEqual(event.title, "Marie")
        self.assertTrue(event.all_day)
        self.assertEqual(event.recurrence, Event.Recurrence.YEARLY)
        self.assertEqual(event.recurrence_month, 4)
        self.assertEqual(event.recurrence_day, 12)
        self.assertEqual(event.start.date(), compute_next_birthday_occurrence(date(1988, 4, 12)))

    def test_contact_birthday_sync_endpoint_rejects_invalid_token(self):
        with mock.patch.dict(os.environ, {"CALENDRIER_API_TOKEN": "shared-secret"}, clear=False):
            response = APIClient().post(
                "/api/integrations/contact-birthdays/sync/",
                {
                    "owner_username": "sylvain",
                    "contact_id": "42",
                    "name": "Marie",
                    "birthday": "1988-04-12",
                },
                format="json",
                HTTP_X_INTERNAL_API_TOKEN="wrong-token",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_events_endpoint_returns_requested_owner_events_with_internal_token(self):
        birthday_calendar = Calendar.objects.create(
            owner=self.user,
            name=BIRTHDAY_CALENDAR_NAME,
            color="#d81b60",
            is_default=False,
            kind=Calendar.Kind.BIRTHDAYS,
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
        expected = Event.objects.create(
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

        with mock.patch.dict(os.environ, {"CALENDRIER_API_TOKEN": "shared-secret"}, clear=False):
            response = APIClient().get(
                "/api/integrations/dashboard/events/",
                {
                    "owner_username": "sylvain",
                    "range_start": now.isoformat(),
                    "range_end": (now + timedelta(days=14)).isoformat(),
                },
                HTTP_X_INTERNAL_API_TOKEN="shared-secret",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [birthday_event.id, expected.id])
        self.assertEqual({item["kind"] for item in response.data}, {"birthday", "event"})

    def test_dashboard_events_endpoint_rejects_invalid_token(self):
        with mock.patch.dict(os.environ, {"CALENDRIER_API_TOKEN": "shared-secret"}, clear=False):
            response = APIClient().get(
                "/api/integrations/dashboard/events/",
                {"owner_username": "sylvain"},
                HTTP_X_INTERNAL_API_TOKEN="wrong-token",
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_events_list_expands_yearly_birthday_for_requested_range(self):
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
            start=timezone.make_aware(datetime(2026, 5, 12, 0, 1)),
            end=timezone.make_aware(datetime(2026, 5, 12, 23, 59)),
            all_day=True,
            recurrence=Event.Recurrence.YEARLY,
            recurrence_month=5,
            recurrence_day=12,
        )

        response = self.client.get(
            "/api/events/",
            {
                "range_start": "2027-05-01T00:00:00-04:00",
                "range_end": "2027-05-31T23:59:00-04:00",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["kind"], "birthday")
        self.assertEqual(response.data[0]["recurrence"], "yearly")
        self.assertEqual(response.data[0]["month"], 5)
        self.assertEqual(response.data[0]["day"], 12)
        self.assertTrue(response.data[0]["start"].startswith("2027-05-12T"))

    def test_events_list_expands_february_29_birthday_to_february_28_on_non_leap_year(self):
        birthday_calendar = Calendar.objects.create(
            owner=self.user,
            name=BIRTHDAY_CALENDAR_NAME,
            color="#d81b60",
            is_default=False,
            kind=Calendar.Kind.BIRTHDAYS,
        )
        Event.objects.create(
            calendar=birthday_calendar,
            title="Jour bissextile",
            start=timezone.make_aware(datetime(2024, 2, 29, 0, 1)),
            end=timezone.make_aware(datetime(2024, 2, 29, 23, 59)),
            all_day=True,
            recurrence=Event.Recurrence.YEARLY,
            recurrence_month=2,
            recurrence_day=29,
        )

        response = self.client.get(
            "/api/events/",
            {
                "range_start": "2027-02-01T00:00:00-05:00",
                "range_end": "2027-02-28T23:59:00-05:00",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]["start"].startswith("2027-02-28T"))

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

        with mock.patch.dict(os.environ, {"CALENDRIER_API_TOKEN": "shared-secret"}, clear=False):
            response = APIClient().post(
                "/api/integrations/contact-birthdays/sync/",
                {
                    "owner_username": "sylvain",
                    "contact_id": "42",
                    "name": "",
                    "birthday": None,
                },
                format="json",
                HTTP_X_INTERNAL_API_TOKEN="shared-secret",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            Event.objects.filter(external_uid=build_contact_birthday_external_uid("sylvain", "42")).exists()
        )
