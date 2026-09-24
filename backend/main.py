from fastapi import FastAPI, UploadFile, File
import pandas as pd
import io

from database import engine
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# SIF PRECURSOR DETECTION
# ============================================================

def detect_sif_precursor(report_text):

    text_lower = str(report_text).lower().strip()

    detected_precursors = []
    life_saving_rule = "None detected"

    # --------------------------------------------------------
    # HELPER FUNCTION
    # --------------------------------------------------------

    def add_precursor(name):
        if name not in detected_precursors:
            detected_precursors.append(name)

    # ========================================================
    # 1. CONFINED SPACE + GAS TESTING
    # ========================================================

    confined_space = (
        "confined space" in text_lower
    )

    gas_testing_problem = (
        "without proper gas testing" in text_lower
        or "without gas testing" in text_lower
        or "gas testing was not completed" in text_lower
        or "gas testing was not done" in text_lower
        or "gas testing not completed" in text_lower
        or "gas test was not completed" in text_lower
        or "no gas testing" in text_lower
    )

    if confined_space:
        add_precursor("Confined Space")
        life_saving_rule = "Confined Space"

    if gas_testing_problem:
        add_precursor("Gas Testing")
        life_saving_rule = "Confined Space"

    # A confined-space report with an unsafe entry condition
    if confined_space and gas_testing_problem:
        add_precursor("Confined Space")
        add_precursor("Gas Testing")


    # ========================================================
    # 2. WORKING AT HEIGHT
    # ========================================================

    height_problem = (
        "working at height" in text_lower
        or "maintenance at height" in text_lower
        or "performing maintenance at height" in text_lower
        or "fall from height" in text_lower
        or "fall protection" in text_lower
        or "without proper fall protection" in text_lower
        or "without fall protection" in text_lower
        or "without proper safety harness" in text_lower
    )

    if height_problem:
        add_precursor("Working at Height")
        life_saving_rule = "Working at Height"


    # ========================================================
    # 3. HOT WORK
    # ========================================================

    hot_work = "hot work" in text_lower

    unsafe_hot_work = (
        "without completing the required safety precautions" in text_lower
        or "without required safety precautions" in text_lower
        or "without safety precautions" in text_lower
        or "without proper precautions" in text_lower
        or "without completing safety precautions" in text_lower
        or "without permit" in text_lower
        or "without a permit" in text_lower
    )

    if hot_work:
        if unsafe_hot_work:
            add_precursor("Hot Work")
            life_saving_rule = "Hot Work"


    # ========================================================
    # 4. ELECTRICAL SAFETY
    # ========================================================

    electrical_problem = (
        "electrical panel was found open" in text_lower
        or "electrical panel was open" in text_lower
        or "exposed electrical components" in text_lower
        or "exposed electrical wires" in text_lower
        or "exposed wires" in text_lower
        or "live electrical" in text_lower
        or "electrical hazard" in text_lower
        or "electrical risk" in text_lower
        or "electrical equipment was damaged" in text_lower
        or "electrical equipment was unsafe" in text_lower
    )

    if electrical_problem:
        add_precursor("Electrical Safety")
        life_saving_rule = "Energy Isolation"


    # ========================================================
    # 5. VEHICLE / PEDESTRIAN INTERACTION
    # ========================================================

    vehicle_problem = (
        (
            "vehicle" in text_lower
            and "pedestrian" in text_lower
        )
        or "vehicle movement was observed near" in text_lower
        or "vehicle movement was observed very close" in text_lower
        or "vehicle was close to pedestrian" in text_lower
        or "vehicle near pedestrian" in text_lower
    )

    if vehicle_problem:
        add_precursor("Vehicle Safety")
        add_precursor("Vehicle-Pedestrian Interaction")
        life_saving_rule = "Vehicle-Pedestrian Interaction"


    # ========================================================
    # 6. LIFTING / SUSPENDED LOAD
    # ========================================================

    lifting_problem = (
        (
            "lifting operation" in text_lower
            and (
                "suspended load" in text_lower
                or "standing close" in text_lower
                or "personnel were standing" in text_lower
                or "people were standing" in text_lower
            )
        )
        or "suspended load" in text_lower
        or "personnel standing close to the suspended" in text_lower
    )

    if lifting_problem:
        add_precursor("Lifting Operations")
        life_saving_rule = "Lifting Operations"


    # ========================================================
    # 7. LOSS OF CONTAINMENT / LEAKAGE
    # ========================================================

    leakage_problem = (
        "oil leakage" in text_lower
        or "oil leak" in text_lower
        or "equipment leakage" in text_lower
        or "leakage was observed" in text_lower
        or "leak was observed" in text_lower
        or "leakage near the equipment" in text_lower
    )

    if leakage_problem:
        add_precursor("Loss of Containment")
        life_saving_rule = "Loss of Containment"


    # ========================================================
    # 8. PPE
    # ========================================================
    # IMPORTANT:
    # PPE alone does NOT mean SIF.
    #
    # Unsafe PPE situations are detected.
    # Proper PPE usage is NOT flagged.
    # ========================================================

    unsafe_ppe = (
    "not wearing the required ppe" in text_lower
    or "not wearing required ppe" in text_lower
    or "not wearing ppe" in text_lower
    or "not wearing the required personal protective equipment" in text_lower
    or "not wearing required personal protective equipment" in text_lower
    or "without required ppe" in text_lower
    or "without proper ppe" in text_lower
    or "ppe was not worn" in text_lower
    or "ppe was missing" in text_lower
    or "required ppe was missing" in text_lower
    or "failed to wear ppe" in text_lower
    or "did not wear ppe" in text_lower
)

    if unsafe_ppe:
        add_precursor("PPE")
        life_saving_rule = "PPE"


    # ========================================================
    # 9. FIRE / FIRE EXTINGUISHER
    # ========================================================

    fire_problem = (
        "fire extinguisher was not available" in text_lower
        or "fire extinguisher was unavailable" in text_lower
        or "fire extinguisher not available" in text_lower
        or "no fire extinguisher" in text_lower
        or "fire protection was not available" in text_lower
        or "fire protection was unavailable" in text_lower
    )

    if fire_problem:
        add_precursor("Fire Safety")
        life_saving_rule = "Fire Safety"


    # ========================================================
    # 10. FIRE / EXPLOSION HAZARD
    # ========================================================

    fire_explosion_problem = (
        "explosion hazard" in text_lower
        or "fire hazard" in text_lower
        or "risk of fire" in text_lower
        or "risk of explosion" in text_lower
        or "fire and explosion" in text_lower
    )

    if fire_explosion_problem:
        add_precursor("Fire & Explosion")
        life_saving_rule = "Fire & Explosion"


    # ========================================================
    # FINAL CLASSIFICATION
    # ========================================================

    if detected_precursors:

        return {
            "sif_potential": True,
            "confidence_score": 0.90,
            "precursors": detected_precursors,
            "life_saving_rule": life_saving_rule
        }

    # --------------------------------------------------------
    # NON-SIF
    # --------------------------------------------------------

    return {
        "sif_potential": False,
        "confidence_score": 0.60,
        "precursors": [],
        "life_saving_rule": "None detected"
    }


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="OIL HSE AI API"
)


# ============================================================
# CORS
# ============================================================

origins = [

    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:5175",
    "http://127.0.0.1:5175",

]


app.add_middleware(

    CORSMiddleware,

    allow_origins=origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {

        "message":
        "OIL HSE AI Backend is running"

    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {

        "status":
        "healthy"

    }


# ============================================================
# GET HSE REPORTS
# ============================================================

@app.get("/reports")
def get_reports():

    with engine.connect() as connection:

        result = connection.execute(

            text(
                """
                SELECT *
                FROM hse_reports
                ORDER BY report_id
                """
            )

        )

        reports = []

        for row in result:

            reports.append(
                dict(row._mapping)
            )

        return reports


# ============================================================
# ANALYZE ONE REPORT
# ============================================================

@app.post("/analyze-report")
def analyze_report(
    report_text: str
):

    result = detect_sif_precursor(
        report_text
    )

    return result


# ============================================================
# SMART ALERTS
# ============================================================

@app.get("/alerts")
def get_alerts():

    with engine.connect() as connection:

        result = connection.execute(

            text(
                """
                SELECT *
                FROM hse_reports
                ORDER BY report_id
                """
            )

        )

        alerts = []

        for row in result:

            report = dict(
                row._mapping
            )

            analysis = detect_sif_precursor(

                report["report_text"]

            )

            if analysis["sif_potential"]:

                alerts.append({

                    "report_id":
                    report["report_id"],

                    "report_date":
                    str(
                        report["report_date"]
                    ),

                    "report_type":
                    report["report_type"],

                    "report_text":
                    report["report_text"],

                    "sif_potential":
                    analysis[
                        "sif_potential"
                    ],

                    "confidence_score":
                    analysis[
                        "confidence_score"
                    ],

                    "precursors":
                    analysis[
                        "precursors"
                    ],

                    "life_saving_rule":
                    analysis[
                        "life_saving_rule"
                    ]

                })

        return alerts


# ============================================================
# RE-ANALYZE EXISTING DATABASE REPORTS
# ============================================================
#
# This endpoint is important for your current 19 reports.
#
# It analyzes the reports already stored in PostgreSQL
# and updates their SIF status and confidence score.
#
# You do NOT need to upload the CSV again.
# ============================================================

@app.post("/reanalyze-reports")
def reanalyze_reports():

    updated_count = 0

    with engine.begin() as connection:

        result = connection.execute(

            text(
                """
                SELECT
                    report_id,
                    report_text
                FROM hse_reports
                ORDER BY report_id
                """
            )

        )

        reports = result.fetchall()

        for report in reports:

            analysis = detect_sif_precursor(

                report.report_text

            )

            connection.execute(

                text(
                    """
                    UPDATE hse_reports

                    SET
                        sif_potential =
                            :sif_potential,

                        confidence_score =
                            :confidence_score

                    WHERE report_id =
                            :report_id
                    """
                ),

                {

                    "sif_potential":
                    analysis[
                        "sif_potential"
                    ],

                    "confidence_score":
                    analysis[
                        "confidence_score"
                    ],

                    "report_id":
                    report.report_id

                }

            )

            updated_count += 1

    return {

        "success": True,

        "reports_reanalyzed":
        updated_count,

        "message":
        "Existing HSE reports were re-analyzed successfully."

    }


# ============================================================
# UPLOAD CSV / EXCEL REPORTS
# ============================================================

@app.post("/upload-reports")
async def upload_reports(

    file: UploadFile = File(...)

):

    contents = await file.read()

    try:

        # ----------------------------------------------------
        # CHECK FILE NAME
        # ----------------------------------------------------

        if not file.filename:

            return {

                "success": False,

                "message":
                "No file selected."

            }


        # ----------------------------------------------------
        # READ CSV
        # ----------------------------------------------------

        if file.filename.lower().endswith(
            ".csv"
        ):

            df = pd.read_csv(

                io.BytesIO(
                    contents
                )

            )


        # ----------------------------------------------------
        # READ EXCEL
        # ----------------------------------------------------

        elif file.filename.lower().endswith(
            ".xlsx"
        ):

            df = pd.read_excel(

                io.BytesIO(
                    contents
                )

            )


        # ----------------------------------------------------
        # INVALID FILE TYPE
        # ----------------------------------------------------

        else:

            return {

                "success": False,

                "message":
                "Only CSV and Excel (.xlsx) files are supported."

            }


        # ----------------------------------------------------
        # REQUIRED COLUMNS
        # ----------------------------------------------------

        required_columns = [

            "report_date",

            "report_type",

            "report_text"

        ]


        # ----------------------------------------------------
        # CHECK REQUIRED COLUMNS
        # ----------------------------------------------------

        missing_columns = [

            column

            for column in required_columns

            if column not in df.columns

        ]


        if missing_columns:

            return {

                "success": False,

                "message":
                "Missing required columns.",

                "missing_columns":
                missing_columns

            }


        # ----------------------------------------------------
        # COUNT RECEIVED ROWS
        # ----------------------------------------------------

        rows_received = len(df)


        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        valid_rows = []

        invalid_rows = []


        for index, row in df.iterrows():

            row_number = index + 2

            report_date = row[
                "report_date"
            ]

            report_type = row[
                "report_type"
            ]

            report_text = row[
                "report_text"
            ]


            # ------------------------------------------------
            # CHECK MISSING VALUES
            # ------------------------------------------------

            if (

                pd.isna(
                    report_date
                )

                or pd.isna(
                    report_type
                )

                or pd.isna(
                    report_text
                )

            ):

                invalid_rows.append({

                    "row":
                    row_number,

                    "reason":
                    "Missing required value."

                })

                continue


            # ------------------------------------------------
            # CLEAN TEXT
            # ------------------------------------------------

            report_type = str(
                report_type
            ).strip()

            report_text = str(
                report_text
            ).strip()


            # ------------------------------------------------
            # CHECK EMPTY TEXT
            # ------------------------------------------------

            if (

                report_type == ""

                or report_text == ""

            ):

                invalid_rows.append({

                    "row":
                    row_number,

                    "reason":
                    "Report type or report text is empty."

                })

                continue


            # ------------------------------------------------
            # VALIDATE DATE
            # ------------------------------------------------

            try:

                report_date = pd.to_datetime(

                    report_date

                ).date()

            except Exception:

                invalid_rows.append({

                    "row":
                    row_number,

                    "reason":
                    "Invalid report date."

                })

                continue


            # ------------------------------------------------
            # ADD VALID ROW
            # ------------------------------------------------

            valid_rows.append({

                "report_date":
                report_date,

                "report_type":
                report_type,

                "report_text":
                report_text

            })


        # ----------------------------------------------------
        # VALIDATION SUMMARY
        # ----------------------------------------------------

        valid_count = len(
            valid_rows
        )

        invalid_count = len(
            invalid_rows
        )


        # ----------------------------------------------------
        # STOP IF NO VALID ROWS
        # ----------------------------------------------------

        if valid_count == 0:

            return {

                "success": False,

                "message":
                "Validation failed. No valid reports found.",

                "rows_received":
                rows_received,

                "valid_rows":
                0,

                "invalid_rows":
                invalid_count,

                "validation_errors":
                invalid_rows

            }


        # ----------------------------------------------------
        # INSERT + AI ANALYSIS
        # ----------------------------------------------------

        inserted_count = 0


        with engine.begin() as connection:

            for row in valid_rows:


                # --------------------------------------------
                # AI / NLP ANALYSIS
                # --------------------------------------------

                analysis = detect_sif_precursor(

                    row[
                        "report_text"
                    ]

                )


                # --------------------------------------------
                # INSERT INTO POSTGRESQL
                # --------------------------------------------

                connection.execute(

                    text(
                        """
                        INSERT INTO hse_reports
                        (
                            report_date,
                            report_type,
                            report_text,
                            sif_potential,
                            confidence_score
                        )

                        VALUES
                        (
                            :report_date,
                            :report_type,
                            :report_text,
                            :sif_potential,
                            :confidence_score
                        )
                        """
                    ),

                    {

                        "report_date":
                        row[
                            "report_date"
                        ],

                        "report_type":
                        row[
                            "report_type"
                        ],

                        "report_text":
                        row[
                            "report_text"
                        ],

                        "sif_potential":
                        analysis[
                            "sif_potential"
                        ],

                        "confidence_score":
                        analysis[
                            "confidence_score"
                        ]

                    }

                )


                inserted_count += 1


        # ----------------------------------------------------
        # SUCCESS RESPONSE
        # ----------------------------------------------------

        return {

            "success":
            True,

            "filename":
            file.filename,

            "rows_received":
            rows_received,

            "valid_rows":
            valid_count,

            "invalid_rows":
            invalid_count,

            "rows_inserted":
            inserted_count,

            "validation_errors":
            invalid_rows,

            "message":
            "File validated, analyzed and saved to PostgreSQL successfully."

        }


    # --------------------------------------------------------
    # ERROR HANDLING
    # --------------------------------------------------------

    except Exception as e:

        return {

            "success":
            False,

            "message":
            str(e)

        }