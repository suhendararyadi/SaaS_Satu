export type CourseActor = {
  id: string;
  isAdmin: boolean;
  role: string;
  classRoomId?: string | null;
};

export type CourseScope = {
  teacherId: string;
  classRoomId: string;
};

export function canManageCourse(actor: CourseActor, course: CourseScope) {
  return (
    actor.isAdmin ||
    actor.role === "SCHOOL_ADMIN" ||
    actor.role === "SUPERADMIN" ||
    course.teacherId === actor.id
  );
}

export function canAccessCourse(actor: CourseActor, course: CourseScope) {
  if (actor.role === "STUDENT" && !actor.isAdmin) {
    return actor.classRoomId === course.classRoomId;
  }
  return canManageCourse(actor, course);
}
