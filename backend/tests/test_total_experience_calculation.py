import os
import sys
import datetime

sys.path.insert(0, os.path.abspath("backend"))

from services import candidate_service

def format_total_experience(total_months: int) -> str:
    years = total_months // 12
    months = total_months % 12
    y_str = f"{years} {'year' if years == 1 else 'years'}"
    m_str = f"{months} {'month' if months == 1 else 'months'}"
    return f"{y_str} {m_str}"

def run_tests():
    print("\n--- STARTING TOTAL EXPERIENCE CALCULATION & NORMALIZATION TESTS ---")

    # TEST 1: Fresher
    m1 = candidate_service.calculate_total_experience_months(total_exp_str="Fresher")
    fmt1 = format_total_experience(m1)
    print(f"TEST 1 (Fresher): {m1} months -> '{fmt1}'")
    assert fmt1 == "0 years 0 months", f"Expected '0 years 0 months', got '{fmt1}'"

    # TEST 2: 6 months experience
    m2 = candidate_service.calculate_total_experience_months(total_exp_str="6 months")
    fmt2 = format_total_experience(m2)
    print(f"TEST 2 (6 months): {m2} months -> '{fmt2}'")
    assert fmt2 == "0 years 6 months", f"Expected '0 years 6 months', got '{fmt2}'"

    # TEST 3: 1 year experience
    m3 = candidate_service.calculate_total_experience_months(total_exp_str="1 year")
    fmt3 = format_total_experience(m3)
    print(f"TEST 3 (1 year): {m3} months -> '{fmt3}'")
    assert fmt3 == "1 year 0 months", f"Expected '1 year 0 months', got '{fmt3}'"

    # TEST 4: 1 year 2 months
    m4 = candidate_service.calculate_total_experience_months(total_exp_str="1 year 2 months")
    fmt4 = format_total_experience(m4)
    print(f"TEST 4 (1 year 2 months): {m4} months -> '{fmt4}'")
    assert fmt4 == "1 year 2 months", f"Expected '1 year 2 months', got '{fmt4}'"

    # TEST 5: 2 years 6 months
    m5 = candidate_service.calculate_total_experience_months(total_exp_str="2 years 6 months")
    fmt5 = format_total_experience(m5)
    print(f"TEST 5 (2 years 6 months): {m5} months -> '{fmt5}'")
    assert fmt5 == "2 years 6 months", f"Expected '2 years 6 months', got '{fmt5}'"

    # TEST 6: Multiple non-overlapping jobs
    text_non_overlap = """
EXPERIENCE
Company A: Jan 2021 – Dec 2022
Company B: Jan 2023 – Jun 2024
"""
    m6 = candidate_service.calculate_total_experience_months(text=text_non_overlap)
    fmt6 = format_total_experience(m6)
    print(f"TEST 6 (Non-overlapping 2y + 1y 6m): {m6} months -> '{fmt6}'")
    assert m6 == 42, f"Expected 42 months, got {m6}"
    assert fmt6 == "3 years 6 months", f"Expected '3 years 6 months', got '{fmt6}'"

    # TEST 7: Overlapping jobs (Jan 2022 - Dec 2023 & Jul 2023 - Jun 2024)
    text_overlap = """
EXPERIENCE
Job A: Jan 2022 – Dec 2023
Job B: Jul 2023 – Jun 2024
"""
    m7 = candidate_service.calculate_total_experience_months(text=text_overlap)
    fmt7 = format_total_experience(m7)
    print(f"TEST 7 (Overlapping jobs - No Double Counting): {m7} months -> '{fmt7}'")
    assert m7 == 30, f"Expected 30 months (2y 6m), got {m7}"
    assert fmt7 == "2 years 6 months", f"Expected '2 years 6 months', got '{fmt7}'"

    # TEST 8: Current job with "Present"
    now = datetime.datetime.now()
    cur_mo_abs = now.year * 12 + now.month
    start_abs = 2025 * 12 + 1 # Jan 2025
    expected_pres_m = cur_mo_abs - start_abs + 1
    
    text_present = "EXPERIENCE\nCompany C: Jan 2025 – Present"
    m8 = candidate_service.calculate_total_experience_months(text=text_present)
    fmt8 = format_total_experience(m8)
    print(f"TEST 8 (Current job up to Present): {m8} months -> '{fmt8}'")
    assert m8 == expected_pres_m, f"Expected {expected_pres_m} months, got {m8}"

    # TEST 9: Resume with no experience
    text_no_exp = "JOHN DOE\nEmail: john@example.com\nEDUCATION\nBSc Computer Science"
    m9 = candidate_service.calculate_total_experience_months(text=text_no_exp)
    fmt9 = format_total_experience(m9)
    print(f"TEST 9 (No experience in text): {m9} months -> '{fmt9}'")
    assert m9 == 0, f"Expected 0 months, got {m9}"
    assert fmt9 == "0 years 0 months", f"Expected '0 years 0 months', got '{fmt9}'"

    # TEST 10: Candidate imported from Job Application Form
    m10 = candidate_service.calculate_total_experience_months(total_exp_str="3.5 years")
    fmt10 = format_total_experience(m10)
    print(f"TEST 10 (Job Application Form '3.5 years'): {m10} months -> '{fmt10}'")
    assert m10 == 42, f"Expected 42 months, got {m10}"
    assert fmt10 == "3 years 6 months"

    # TEST 11: Candidate imported from Job Board
    m11 = candidate_service.calculate_total_experience_months(total_exp_str="7 years 4 months")
    fmt11 = format_total_experience(m11)
    print(f"TEST 11 (Job Board '7 years 4 months'): {m11} months -> '{fmt11}'")
    assert m11 == 88, f"Expected 88 months, got {m11}"
    assert fmt11 == "7 years 4 months"

    # TEST 12: Aditi Jadhav's Resume (Nov 2025 - Dec 2025)
    aditi_text = "WORK EXPERIENCE\nData Engineer Trainee\nThinkbridge Software Pvt Ltd, Pune\nNov 2025 – Dec 2025"
    m12 = candidate_service.calculate_total_experience_months(text=aditi_text)
    fmt12 = format_total_experience(m12)
    print(f"TEST 12 (Aditi Resume Nov 2025 - Dec 2025): {m12} months -> '{fmt12}'")
    assert m12 in (1, 2), f"Expected 1 or 2 months for Aditi, got {m12}"

    print("\n=============================================================")
    print("ALL 12 TOTAL EXPERIENCE CALCULATION TESTS PASSED 100%!")
    print("=============================================================")

if __name__ == "__main__":
    run_tests()
