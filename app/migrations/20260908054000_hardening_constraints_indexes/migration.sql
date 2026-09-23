-- AlterTable
ALTER TABLE "DailyStats" ALTER COLUMN "totalViews" DROP NOT NULL,
ALTER COLUMN "totalViews" DROP DEFAULT,
ALTER COLUMN "prevDayViewsChangePercent" DROP NOT NULL,
ALTER COLUMN "prevDayViewsChangePercent" DROP DEFAULT,
ALTER COLUMN "totalRevenue" DROP NOT NULL,
ALTER COLUMN "totalRevenue" DROP DEFAULT,
ALTER COLUMN "totalProfit" DROP NOT NULL,
ALTER COLUMN "totalProfit" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId", "role");

-- CreateIndex
CREATE INDEX "User_schoolId_classRoomId_idx" ON "User"("schoolId", "classRoomId");

-- CreateIndex
CREATE INDEX "AcademicYear_schoolId_isActive_idx" ON "AcademicYear"("schoolId", "isActive");

-- CreateIndex
CREATE INDEX "ClassRoom_schoolId_academicYearId_idx" ON "ClassRoom"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "ClassRoom_schoolId_departmentId_idx" ON "ClassRoom"("schoolId", "departmentId");

-- CreateIndex
CREATE INDEX "ClassRoom_schoolId_homeroomTeacherId_idx" ON "ClassRoom"("schoolId", "homeroomTeacherId");

-- CreateIndex
CREATE INDEX "Company_schoolId_name_idx" ON "Company"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Placement_schoolId_studentId_status_idx" ON "Placement"("schoolId", "studentId", "status");

-- CreateIndex
CREATE INDEX "Placement_schoolId_companyId_status_idx" ON "Placement"("schoolId", "companyId", "status");

-- CreateIndex
CREATE INDEX "Placement_schoolId_teacherSupervisorId_idx" ON "Placement"("schoolId", "teacherSupervisorId");

-- CreateIndex
CREATE INDEX "AttendanceLog_placementId_dateOnly_idx" ON "AttendanceLog"("placementId", "dateOnly");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_placementId_dateOnly_type_key" ON "AttendanceLog"("placementId", "dateOnly", "type");

-- CreateIndex
CREATE INDEX "DailyJournal_placementId_date_idx" ON "DailyJournal"("placementId", "date");

-- CreateIndex
CREATE INDEX "LmsCourse_schoolId_classRoomId_idx" ON "LmsCourse"("schoolId", "classRoomId");

-- CreateIndex
CREATE INDEX "LmsCourse_schoolId_teacherId_idx" ON "LmsCourse"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "LmsCourse_schoolId_academicYearId_idx" ON "LmsCourse"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "LmsAgenda_courseId_date_idx" ON "LmsAgenda"("courseId", "date");

-- CreateIndex
CREATE INDEX "LmsAttendanceSession_courseId_date_idx" ON "LmsAttendanceSession"("courseId", "date");

-- CreateIndex
CREATE INDEX "LmsAttendanceRecord_studentId_idx" ON "LmsAttendanceRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsAttendanceRecord_sessionId_studentId_key" ON "LmsAttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "LmsMaterial_courseId_createdAt_idx" ON "LmsMaterial"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "LmsAssignment_courseId_deadline_idx" ON "LmsAssignment"("courseId", "deadline");

-- CreateIndex
CREATE INDEX "LmsSubmission_studentId_submittedAt_idx" ON "LmsSubmission"("studentId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LmsSubmission_assignmentId_studentId_key" ON "LmsSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "LmsAssessment_courseId_startTime_endTime_idx" ON "LmsAssessment"("courseId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "LmsAssessmentQuestion_assessmentId_idx" ON "LmsAssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE INDEX "LmsAssessmentResult_studentId_finishedAt_idx" ON "LmsAssessmentResult"("studentId", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LmsAssessmentResult_assessmentId_studentId_key" ON "LmsAssessmentResult"("assessmentId", "studentId");

-- CreateIndex
CREATE INDEX "DutyTeacherReport_schoolId_date_idx" ON "DutyTeacherReport"("schoolId", "date");

-- CreateIndex
CREATE INDEX "File_userId_createdAt_idx" ON "File"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "File_userId_s3Key_key" ON "File"("userId", "s3Key");

