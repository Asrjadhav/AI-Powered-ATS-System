import requests
import sys
import os
import uuid
import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.notification import NotificationModel

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("\n--- Starting Phase 2G Notifications API & PostgreSQL Test Workflow ---")
    db: Session = SessionLocal()

    test_id = str(uuid.uuid4())[:8]
    notif_id = f"notif-test-{test_id}"

    try:
        # 1. CREATE NOTIFICATION VIA API
        create_res = requests.post(f"{BASE_URL}/notifications", json={
            "id": notif_id,
            "title": f"Test Interview Notification {test_id}",
            "message": "Candidate interview scheduled for 10:00 AM IST.",
            "type": "interview_reminder",
            "isRead": False,
            "candidateName": "Test Candidate",
            "jobTitle": "Lead System Architect"
        })

        if create_res.status_code != 201:
            print(f"FAILED POST /notifications: {create_res.status_code} - {create_res.text}")
            sys.exit(1)

        notif_data = create_res.json()
        print(f"1. POST API SUCCESS: Created notification '{notif_data['id']}' ({notif_data['title']}).")

        # 2. VERIFY POSTGRESQL NOTIFICATIONS TABLE DIRECTLY
        db.expire_all()
        db_notif = db.query(NotificationModel).filter(NotificationModel.id == notif_id).first()
        if not db_notif or db_notif.isRead is not False or db_notif.type != "interview_reminder":
            print(f"FAILED PostgreSQL check: Got isRead={db_notif.isRead if db_notif else None}, type={db_notif.type if db_notif else None}")
            sys.exit(1)
        print(f"2. POSTGRESQL CHECK: Verified row in 'notifications' table! (isRead={db_notif.isRead}, title='{db_notif.title}')")

        # 3. GET NOTIFICATION BY ID
        get_single = requests.get(f"{BASE_URL}/notifications/{notif_id}")
        if get_single.status_code != 200 or get_single.json()["id"] != notif_id:
            print(f"FAILED GET /notifications/{notif_id}: {get_single.status_code}")
            sys.exit(1)
        print("3. GET BY ID SUCCESS: Notification retrieved via GET /api/notifications/{id}!")

        # 4. MARK SPECIFIC NOTIFICATION AS READ
        read_res = requests.patch(f"{BASE_URL}/notifications/{notif_id}/read")
        if read_res.status_code != 200 or not read_res.json().get("isRead"):
            print(f"FAILED PATCH /notifications/{notif_id}/read: {read_res.status_code}")
            sys.exit(1)
        print("4. PATCH READ API SUCCESS: Marked notification as read.")

        # 5. VERIFY ISREAD=TRUE IN POSTGRESQL DIRECTLY
        db.expire_all()
        db_notif_read = db.query(NotificationModel).filter(NotificationModel.id == notif_id).first()
        if db_notif_read.isRead is not True:
            print(f"FAILED PostgreSQL read status check: Got isRead={db_notif_read.isRead}")
            sys.exit(1)
        print("5. POSTGRESQL CHECK: Verified isRead=True stored in PostgreSQL 'notifications' table!")

        # 6. CREATE SECOND UNREAD NOTIFICATION AND TEST MARK ALL AS READ
        notif_id2 = f"notif-test2-{test_id}"
        requests.post(f"{BASE_URL}/notifications", json={
            "id": notif_id2,
            "title": "Second Test Notification",
            "message": "Offer accepted.",
            "type": "offer_accepted",
            "isRead": False
        })

        read_all_res = requests.patch(f"{BASE_URL}/notifications/read-all")
        if read_all_res.status_code != 200:
            print(f"FAILED PATCH /notifications/read-all: {read_all_res.status_code}")
            sys.exit(1)
        print("6. PATCH READ-ALL API SUCCESS: Marked all notifications as read.")

        db.expire_all()
        unread_count = db.query(NotificationModel).filter(NotificationModel.isRead == False).count()
        if unread_count != 0:
            print(f"FAILED PostgreSQL read-all check: Remaining unread count = {unread_count}")
            sys.exit(1)
        print("7. POSTGRESQL CHECK: Verified 0 unread notifications remain in PostgreSQL!")

        # 7. DELETE SINGLE NOTIFICATION
        del_res = requests.delete(f"{BASE_URL}/notifications/{notif_id}")
        if del_res.status_code != 200:
            print(f"FAILED DELETE /notifications/{notif_id}: {del_res.status_code}")
            sys.exit(1)
        print("8. DELETE API SUCCESS: Deleted single notification.")

        db.expire_all()
        deleted_notif = db.query(NotificationModel).filter(NotificationModel.id == notif_id).first()
        assert deleted_notif is None, "Notification row should be deleted from PostgreSQL!"
        print("9. POSTGRESQL CHECK: Verified row cleanly removed from 'notifications' table!")

        # 8. INVALID NOTIFICATION ID 404 CHECK
        err_res = requests.get(f"{BASE_URL}/notifications/invalid-id-99999")
        if err_res.status_code == 404:
            print("10. 404 CHECK: Invalid notification ID returned 404 Not Found cleanly!")
        else:
            print(f"FAILED 404 Check: Got {err_res.status_code}")
            sys.exit(1)

        print("\nALL PHASE 2G NOTIFICATIONS API & POSTGRESQL CHECKS PASSED CLEANLY!")

    finally:
        db.query(NotificationModel).filter(NotificationModel.id.in_([notif_id, f"notif-test2-{test_id}"])).delete(synchronize_session=False)
        db.commit()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_test()
