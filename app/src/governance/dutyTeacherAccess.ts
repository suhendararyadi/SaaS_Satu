export type DutyTeacherReadContext = {
  isAdmin: boolean;
  configuredAssignmentCount: number;
  hasActiveAssignment: boolean;
};

export function canReadDutyTeacherReports(input: DutyTeacherReadContext) {
  if (input.isAdmin) return true;
  if (input.configuredAssignmentCount === 0) return true;
  return input.hasActiveAssignment;
}
