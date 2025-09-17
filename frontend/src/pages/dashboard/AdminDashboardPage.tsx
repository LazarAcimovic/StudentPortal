import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { RoleEnum } from "../../models/Enums";

import { createEnrollment } from "../../services/api/enrollmentService";
import { getAllUsers } from "../../services/api/userService";
import { updateUser } from "../../services/api/userService";
import { getAllSubjects } from "../../services/api/subjectService";
import { createSubject } from "../../services/api/subjectService";
import { updateSubject } from "../../services/api/subjectService";
import { getAllEnrollments } from "../../services/api/enrollmentService";
import { addUser } from "../../services/api/userService";
import { deleteUser } from "../../services/api/userService";
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
      // Prikaz greške korisnikFUu
      alert(
        "Kreiranje korisnika nije uspelo. Moguće da korisnik sa tim emailom već postoji."
      );
    }
  };
  const handleUpdateUser = async (updatedUser: UpdateUser) => {
    // updatedUser objekat ovde sadrži ID korisnika
    const updatedUserData = await updateUser(updatedUser);

    if (updatedUserData) {
      setUsers(
        users.map((u) => (u.id === updatedUserData.id ? updatedUserData : u))
      );
      setEditingUser(null);
      console.log("Ažuriran korisnik:", updatedUserData);
    } else {
      alert("Ažuriranje korisnika nije uspelo.");
    }
  };
  const handleDeleteUser = async (userId: number) => {
    const isSuccess = await deleteUser(userId);

    if (isSuccess) {
      // Filtriramo korisnika iz liste ako je brisanje uspešno
      setUsers(users.filter((u) => u.id !== userId));
      console.log("Obrisan korisnik sa ID-jem:", userId);
      alert("Korisnik je uspešno obrisan."); //zameniš sa toast eventualno
    } else {
      alert("Brisanje korisnika nije uspelo.");
    }
  };
  const handleCreateSubject = async (newSubject: CreateSubject) => {
    const createdSubject = await createSubject(newSubject);

    if (createdSubject) {
      setSubjects([...subjects, createdSubject]);
      setIsCreatingSubject(false);
      console.log("Kreiran novi predmet:", createdSubject);
    } else {
      alert("Kreiranje predmeta nije uspelo.");
    }
  };
  const handleUpdateSubject = async (updatedSubject: UpdateSubject) => {
    const updatedSubjectData = await updateSubject(updatedSubject);

    if (updatedSubjectData) {
      setSubjects(
        subjects.map((s) =>
          s.id === updatedSubjectData.id ? updatedSubjectData : s
        )
      );
      setEditingSubject(null);
      console.log("Ažuriran predmet:", updatedSubjectData);
    } else {
      alert("Ažuriranje predmeta nije uspelo.");
    }
  };

  const handleCreateEnrollment = async (newEnrollment: CreateEnrollment) => {
    const createdEnrollment = await createEnrollment(newEnrollment);

    if (createdEnrollment) {
      setEnrollments([...enrollments, createdEnrollment]);
      setIsCreatingEnrollment(false);
      console.log("Kreiran novi upis:", createdEnrollment);
    } else {
      alert("Kreiranje upisa nije uspelo.");
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
                enrollments={enrollments}
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
