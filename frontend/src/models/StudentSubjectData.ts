import type { Subject } from "./SubjectModel";
import type { Grade } from "./GradeModel";

// Tip za podatke o predmetu i ocenama, koji se dobijaju sa backend-a
export type StudentSubjectData = {
  enrollmentId: number;
  subject: Subject;
  grades: Grade[];
};
