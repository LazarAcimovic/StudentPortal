import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";
import { MOCK_STUDENTS } from "../../services/data/studentMock";
import { MOCK_PROFESSORS } from "../../services/data/professorsMock";
import { MOCK_SUBJECTS } from "../../services/data/subjectsMock";
import { MOCK_ENROLLMENTS } from "../../services/data/enrollmentsMock";
import { getAllUsers } from "../../services/api/userService";
import { getAllSubjects } from "../../services/api/subjectService";
import { getAllEnrollments } from "../../services/api/enrollmentService";
import { addUser } from "../../services/api/userService";
import type { User, CreateUser, UpdateUser } from "../../models/UserModel";
import type {
  Subject,
  CreateSubject,
  UpdateSubject,
} from "../../models/SubjectModel";
import type {
  Enrollment,
  CreateEnrollment,
} from "../../models/EnrollmentModel";
import UsersTable from "../../components/admin/UsersTable";
import UserEditForm from "../../components/admin/UserEditForm";
import UserCreateForm from "../../components/admin/UserCreateForm";
import SubjectsTable from "../../components/admin/SubjectsTable";
import SubjectEditForm from "../../components/admin/SubjectEditForm";
import SubjectCreateForm from "../../components/admin/SubjectCreateForm";
import EnrollmentsTable from "../../components/admin/EnrollmentsTable";
import EnrollmentCreateForm from "../../components/admin/EnrollmentCreateForm";
const AdminDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState<boolean>(false);
  const [isCreatingEnrollment, setIsCreatingEnrollment] =
    useState<boolean>(false);
  useEffect(() => {
    // setUsers([...MOCK_STUDENTS, ...MOCK_PROFESSORS]);
    // setSubjects(MOCK_SUBJECTS);
    // setEnrollments(MOCK_ENROLLMENTS);
    const fetchUsers = async () => {
      const usersData = await getAllUsers();
      if (usersData) {
        setUsers(usersData);
      }
    };

    const fetchSubjects = async () => {
      const subjectsData = await getAllSubjects();
      if (subjectsData) {
        setSubjects(subjectsData);
      }
    };

    const fetchEnrollments = async () => {
      const enrollmentsData = await getAllEnrollments();
      if (enrollmentsData) {
        setEnrollments(enrollmentsData);
      }
    };

    fetchUsers();
    fetchSubjects();
    fetchEnrollments();
  }, []);
  if (!user || user.userRole !== RoleEnum.Admin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Pristup zabranjen</h3>
          <p>Nemate administratorske dozvole za pristup ovoj stranici.</p>
        </div>
      </div>
    );
  }
  const handleCreateUser = async (newUser: CreateUser) => {
    // Pozivamo backend funkciju umesto mock logike
    const createdUser = await addUser(newUser);

    if (createdUser) {
      // Ako je korisnik uspešno kreiran na backendu, dodaj ga u stanje na frontendu
      setUsers([...users, createdUser]);
      setIsCreatingUser(false);
      console.log("Kreiran novi korisnik:", createdUser);
    } else {
      // Prikaz greške korisniku
      alert(
        "Kreiranje korisnika nije uspelo. Moguće da korisnik sa tim emailom već postoji."
      );
    }
  };
  const handleUpdateUser = (updatedUser: UpdateUser) => {
    setUsers(
      users.map((u) => (u.id === updatedUser.Id ? { ...u, ...updatedUser } : u))
    );
    setEditingUser(null);
    console.log("Ažuriran korisnik:", updatedUser);
  };
  const handleDeleteUser = (userId: number) => {
    setUsers(
      users.map((u) => (u.Id === userId ? { ...u, IsDeleted: true } : u))
    );
    console.log("Obrisan korisnik sa ID-jem:", userId);
  };
  const handleCreateSubject = (newSubject: CreateSubject) => {
    const newSubjectId =
      subjects.length > 0 ? Math.max(...subjects.map((s) => s.Id)) + 1 : 1;
    const subjectToAdd: Subject = {
      id: newSubjectId,
      ...newSubject,
      professorFirstName:
        users.find((p) => p.Id === newSubject.ProfessorId)?.firstName || "N/A",
      professorLastName:
        users.find((p) => p.Id === newSubject.ProfessorId)?.lastName || "N/A",
      isDeleted: false,
      createdAt: new Date(),
    };
    setSubjects([...subjects, subjectToAdd]);
    setIsCreatingSubject(false);
    console.log("Kreiran novi predmet:", subjectToAdd);
  };
  const handleUpdateSubject = (updatedSubject: UpdateSubject) => {
    const updatedSubjects = subjects.map((s) => {
      if (s.id === updatedSubject.Id) {
        return {
          ...s,
          ...updatedSubject,
          ProfessorFirstName:
            users.find((p) => p.id === updatedSubject.ProfessorId)?.firstName ||
            "N/A",
          ProfessorLastName:
            users.find((p) => p.id === updatedSubject.ProfessorId)?.lastName ||
            "N/A",
        };
      }
      return s;
    });
    setSubjects(updatedSubjects);
    setEditingSubject(null);
    console.log("Ažuriran predmet:", updatedSubject);
  };
  const handleCreateEnrollment = (newEnrollment: CreateEnrollment) => {
    const newEnrollmentId =
      enrollments.length > 0
        ? Math.max(...enrollments.map((e) => e.Id)) + 1
        : 1;
    const student = users.find((s) => s.Id === newEnrollment.StudentId);
    const subject = subjects.find((s) => s.Id === newEnrollment.SubjectId);
    if (student && subject) {
      const enrollmentToAdd: Enrollment = {
        Id: newEnrollmentId,
        ...newEnrollment,
        StudentFirstName: student.FirstName,
        StudentLastName: student.LastName,
        SubjectName: subject.SubjectName,
        EnrolledAt: new Date(),
      };
      setEnrollments([...enrollments, enrollmentToAdd]);
      console.log("Kreiran novi upis:", enrollmentToAdd);
      setIsCreatingEnrollment(false);
    } else {
      console.error("Greška: Student ili predmet nisu pronađeni.");
    }
  };
  const handleDeleteEnrollment = (enrollmentId: number) => {
    setEnrollments(
      enrollments.map((e) =>
        e.Id === enrollmentId ? { ...e, IsDeleted: true } : e
      )
    );
    console.log("Obrisan upis sa ID-jem:", enrollmentId);
  };
  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <>
            <h3>Upravljanje Korisnicima</h3>
            {isCreatingUser ? (
              <UserCreateForm
                onSave={handleCreateUser}
                onCancel={() => setIsCreatingUser(false)}
              />
            ) : editingUser ? (
              <UserEditForm
                user={editingUser}
                onSave={handleUpdateUser}
                onCancel={() => setEditingUser(null)}
              />
            ) : (
              <>
                <div className="d-flex justify-content-end mb-3">
                  <button
                    className="btn btn-success"
                    onClick={() => setIsCreatingUser(true)}
                  >
                    Kreiraj novog korisnika
                  </button>
                </div>
                <UsersTable
                  users={users}
                  onDeleteUser={handleDeleteUser}
                  onStartEdit={(userToEdit) => setEditingUser(userToEdit)}
                />
              </>
            )}
          </>
        );
      case "subjects":
        return (
          <>
            <h3>Upravljanje Predmetima</h3>
            {isCreatingSubject ? (
              <SubjectCreateForm
                professors={users.filter(
                  (u) => u.userRole === RoleEnum.Professor
                )}
                onSave={handleCreateSubject}
                onCancel={() => setIsCreatingSubject(false)}
              />
            ) : editingSubject ? (
              <SubjectEditForm
                subject={editingSubject}
                professors={users.filter(
                  (u) => u.userRole === RoleEnum.Professor
                )}
                onSave={handleUpdateSubject}
                onCancel={() => setEditingSubject(null)}
              />
            ) : (
              <>
                <div className="d-flex justify-content-end mb-3">
                  <button
                    className="btn btn-success"
                    onClick={() => setIsCreatingSubject(true)}
                  >
                    Kreiraj novi predmet
                  </button>
                </div>
                <SubjectsTable
                  subjects={subjects}
                  onStartEdit={(subjectToEdit) =>
                    setEditingSubject(subjectToEdit)
                  }
                />
              </>
            )}
          </>
        );
      case "enrollments":
        return (
          <>
            <h3>Upis studenata na predmete</h3>
            {isCreatingEnrollment ? (
              <EnrollmentCreateForm
                students={users.filter((u) => u.userRole === RoleEnum.Student)}
                subjects={subjects}
                onSave={handleCreateEnrollment}
                onCancel={() => setIsCreatingEnrollment(false)}
              />
            ) : (
              <>
                <div className="d-flex justify-content-end mb-3">
                  <button
                    className="btn btn-success"
                    onClick={() => setIsCreatingEnrollment(true)}
                  >
                    Kreiraj novi upis
                  </button>
                </div>
                <EnrollmentsTable
                  enrollments={enrollments}
                  onDeleteEnrollment={handleDeleteEnrollment}
                />
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };
  return (
    <div className="container mt-4">
      <h2>Admin Dashboard</h2>
      <h4 className="mb-4">Dobrodošli,{user.firstName}!</h4>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Korisnici
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            Predmeti
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${
              activeTab === "enrollments" ? "active" : ""
            }`}
            onClick={() => setActiveTab("enrollments")}
          >
            Upisi
          </button>
        </li>
      </ul>
      {renderContent()}
    </div>
  );
};
export default AdminDashboardPage;
