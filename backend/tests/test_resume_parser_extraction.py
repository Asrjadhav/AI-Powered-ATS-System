import os
import sys
import json

sys.path.insert(0, os.path.abspath("backend"))

from services import candidate_service

def run_tests():
    print("\n--- STARTING ZERO-MOCK RESUME PARSER EXTRACTION TEST ---")

    aditi_resume_text = """
ADITI JADHAV
Email: aditijadhav2828@gmail.com
Phone: 8169806168
Location: Pune, Maharashtra

OBJECTIVE
Motivated Computer Engineering graduate looking for Data Engineering opportunities.

EDUCATION
BE Computer Engineering
Dr. D. Y. Patil Institute of Technology, Pune
2025
CGPA: 7.94/10

WORK EXPERIENCE
Data Engineer Trainee
Thinkbridge Software Pvt Ltd, Pune
Nov 2025 – Dec 2025
- Built data processing pipelines in Python and SQL Server.
- Configured Windows Server, Active Directory, DNS, DHCP, IIS, VMware, AWS, GCP, and Git repositories.
"""

    p1 = candidate_service.parse_resume_document(raw_content=aditi_resume_text, filename="Aditi_Jadhav_Resume.pdf").get("parsed", {})
    print("\n1. PARSED ADITI RESUME DATA:\n", json.dumps(p1, indent=2))

    assert p1.get("firstName") == "Aditi", f"Expected Aditi, got {p1.get('firstName')}"
    assert p1.get("lastName") == "Jadhav", f"Expected Jadhav, got {p1.get('lastName')}"
    assert p1.get("email") == "aditijadhav2828@gmail.com", f"Expected aditijadhav2828@gmail.com, got {p1.get('email')}"
    assert p1.get("phone") == "8169806168", f"Expected 8169806168, got {p1.get('phone')}"
    assert p1.get("role") == "Data Engineer Trainee", f"Expected Data Engineer Trainee, got {p1.get('role')}"
    assert "Thinkbridge" in p1.get("company", ""), f"Expected Thinkbridge, got {p1.get('company')}"
    assert p1.get("company") != "Syska Technologies", "FAILED: Got mock company Syska Technologies!"
    assert p1.get("role") != "IT Program Manager", "FAILED: Got mock role IT Program Manager!"

    rahul_resume_text = """
RAHUL DESHMUKH
Email: rahul.deshmukh@example.com
Phone: 9822012345
Location: Mumbai, India

WORK EXPERIENCE
Senior Python Engineer
TCS Data Labs
Jan 2020 – Present
- Developed FastAPI microservices and PostgreSQL databases.
"""

    p2 = candidate_service.parse_resume_document(raw_content=rahul_resume_text, filename="Rahul_Deshmukh_Resume.pdf").get("parsed", {})
    print("\n2. PARSED RAHUL RESUME DATA:\n", json.dumps(p2, indent=2))

    assert p2.get("firstName") == "Rahul", f"Expected Rahul, got {p2.get('firstName')}"
    assert p2.get("lastName") == "Deshmukh", f"Expected Deshmukh, got {p2.get('lastName')}"
    assert p2.get("email") == "rahul.deshmukh@example.com", f"Expected rahul.deshmukh@example.com, got {p2.get('email')}"
    assert p2.get("phone") == "9822012345", f"Expected 9822012345, got {p2.get('phone')}"
    assert p2.get("role") == "Senior Python Engineer", f"Expected Senior Python Engineer, got {p2.get('role')}"
    assert p2.get("company") == "TCS Data Labs", f"Expected TCS Data Labs, got {p2.get('company')}"

    rohan_resume_text = """
Rohan Mehta
Role: Marketing Manager
Email: rohan.mehta.demo@gmail.com
Phone: +91 90000 10001
Location: Pune, Maharashtra

Experience:
BrightWave Digital Solutions, Pune | Marketing Manager | Apr 2024 – Present
MarketNest Technologies, Mumbai | Digital Marketing Executive | Jul 2022 – Mar 2024

Professional summary:
Marketing professional with 4+ years of experience in digital campaigns, performance marketing, SEO, content strategy, lead generation and marketing analytics.
"""

    p3 = candidate_service.parse_resume_document(raw_content=rohan_resume_text, filename="01_Marketing_Manager_Rohan_Mehta.pdf").get("parsed", {})
    print("\n3. PARSED ROHAN RESUME DATA (WITH FILENAME 01_Marketing_Manager_Rohan_Mehta.pdf):\n", json.dumps(p3, indent=2))

    assert p3.get("firstName") == "Rohan", f"Expected Rohan, got '{p3.get('firstName')}'"
    assert p3.get("lastName") == "Mehta", f"Expected Mehta, got '{p3.get('lastName')}'"
    assert p3.get("email") == "rohan.mehta.demo@gmail.com", f"Expected rohan.mehta.demo@gmail.com, got '{p3.get('email')}'"
    assert "90000 10001" in p3.get("phone", ""), f"Expected +91 90000 10001, got '{p3.get('phone')}'"
    assert p3.get("location") == "Pune, Maharashtra", f"Expected Pune, Maharashtra, got '{p3.get('location')}'"
    assert p3.get("role") == "Marketing Manager", f"Expected Marketing Manager, got '{p3.get('role')}'"
    assert p3.get("company") == "BrightWave Digital Solutions", f"Expected BrightWave Digital Solutions, got '{p3.get('company')}'"
    assert p3.get("experienceYears") > 0, f"Expected experienceYears > 0 derived dynamically from employment dates, got {p3.get('experienceYears')}"

    nikhil_resume_text = """
NIKHIL PATIL
Backend Python Engineer
Email: nikhil.patil.dev@gmail.com
Phone: +91 98765 43210
Location: Pune, India

WORK EXPERIENCE
Backend Python Engineer | TechSphere Solutions, Pune
Jan 2022 – Present
- Built high-throughput Python FastAPI microservices and PostgreSQL databases.
- Integrated Redis cache and Docker container deployment pipelines.
"""

    p4 = candidate_service.parse_resume_document(raw_content=nikhil_resume_text, filename="04 Backend Python Engineer Nikhil Patil.pdf").get("parsed", {})
    print("\n4. PARSED NIKHIL RESUME DATA (WITH FILENAME 04 Backend Python Engineer Nikhil Patil.pdf):\n", json.dumps(p4, indent=2))

    assert p4.get("firstName") == "Nikhil", f"Expected Nikhil, got '{p4.get('firstName')}'"
    assert p4.get("lastName") == "Patil", f"Expected Patil, got '{p4.get('lastName')}'"
    assert p4.get("email") == "nikhil.patil.dev@gmail.com", f"Expected nikhil.patil.dev@gmail.com, got '{p4.get('email')}'"
    assert "98765 43210" in p4.get("phone", ""), f"Expected +91 98765 43210, got '{p4.get('phone')}'"
    assert p4.get("role") == "Backend Python Engineer", f"Expected Backend Python Engineer, got '{p4.get('role')}'"
    assert "0000000000" not in p4.get("phone", ""), "FAILED: Got dummy phone 0000000000!"

    print("\n=============================================================")
    print("RESUME PARSER EXTRACTION TEST (ADITI, RAHUL, ROHAN & NIKHIL) PASSED 100%!")
    print("=============================================================")

if __name__ == "__main__":
    run_tests()
