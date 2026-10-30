import React, { useState, useEffect } from "react";
import { useUserStore } from "../../../store/user/useUserStore";
import { USER_ROLES } from "../../../shared/constants/constants";

import { createEnrollment, getAllEnrollments } from "../../subjects/api/enrollmentService";
import type { CreateEnrollmentResult } from "../../subjects/api/enrollmentService";
import { getAllUsers, addUser, deleteUser } from "../api/userService";
import type { AddUserResult } from "../api/userService";
import { getAllSubjects, createSubject, updateSubject } from "../../subjects/api/subjectService";
import type { CreateSubjectResult, UpdateSubjectResult } from "../../subjects/api/subjectService";
import type { User, CreateUser } from "../../../shared/models/User";
import type {
  Subject,
  CreateSubject,
  UpdateSubject,
} from "../../subjects/models/subject";
import type {
  Enrollment,
  CreateEnrollment,
} from "../../subjects/models/enrollment";
import Modal from "../../../components/ui/Modal";
import UsersTable from "../components/admin/UsersTable";
import UserEditForm from "../../../components/ui/UserEditForm";
import UserCreateForm from "../components/admin/UserCreateForm";
import SubjectsTable from "../components/admin/SubjectsTable";
import SubjectEditForm from "../components/admin/SubjectEditForm";
import SubjectCreateForm from "../components/admin/SubjectCreateForm";
import EnrollmentsTable from "../components/admin/EnrollmentsTable";
import EnrollmentCreateForm from "../components/admin/EnrollmentCreateForm";
import EscalationsTab from "../components/admin/EscalationsTab";

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useUserStore();
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
  if (!currentUser || currentUser.userRole !== USER_ROLES.Admin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger text-center">
          <h3>Access denied</h3>
          <p>You do not have admin permissions to access this page.</p>
        </div>
      </div>
    );
  }
  const handleCreateUser = async (
    newUser: CreateUser
  ): Promise<AddUserResult> => {
    const result = await addUser(newUser);

    if (result.ok) {
      setUsers([...users, result.user]);
      setIsCreatingUser(false);
    }

    // The form renders any errors inline; it just needs the result back.
    return result;
  };
  const handleUserSaved = (updatedUser: User) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
  };
  const handleDeleteUser = async (userId: string) => {
    const isSuccess = await deleteUser(userId);

    if (isSuccess) {
      setUsers(users.filter((u) => u.id !== userId));
      console.log("Deleted user with ID:", userId);
      alert("User deleted successfully.");
    } else {
      alert("Failed to delete user.");
    }
  };
  const handleCreateSubject = async (
    newSubject: CreateSubject
  ): Promise<CreateSubjectResult> => {
    const result = await createSubject(newSubject);

    if (result.ok) {
      setSubjects([...subjects, result.subject]);
      setIsCreatingSubject(false);
    }

    // The form renders any errors inline; it just needs the result back.
    return result;
  };
  const handleUpdateSubject = async (
    updatedSubject: UpdateSubject
  ): Promise<UpdateSubjectResult> => {
    const result = await updateSubject(updatedSubject);

    if (result.ok) {
      setSubjects(
        subjects.map((s) => (s.id === result.subject.id ? result.subject : s))
      );
      setEditingSubject(null);
    }

    return result;
  };

  const handleCreateEnrollment = async (
    newEnrollment: CreateEnrollment
  ): Promise<CreateEnrollmentResult> => {
    const result = await createEnrollment(newEnrollment);

    if (result.ok) {
      setEnrollments([...enrollments, result.enrollment]);
      setIsCreatingEnrollment(false);
    }

    return result;
  };
  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <>
            <h3>Manage Users</h3>
            {isCreatingUser ? (
              <UserCreateForm
                onSave={handleCreateUser}
                onCancel={() => setIsCreatingUser(false)}
              />
            ) : (
              <>
                <div className="d-flex justify-content-end mb-3">
                  <button
                    className="btn btn-success"
                    onClick={() => setIsCreatingUser(true)}
                  >
                    Create New User
                  </button>
                </div>
                <UsersTable
                  users={users}
                  currentUserId={currentUser.id}
                  onDeleteUser={handleDeleteUser}
                  onStartEdit={(userToEdit) => setEditingUser(userToEdit)}
                />
              </>
            )}
            <Modal
              open={editingUser !== null}
              onClose={() => setEditingUser(null)}
              blurBackdrop
              title={
                editingUser
                  ? `Edit User: ${editingUser.firstName} ${editingUser.lastName}`
                  : "Edit User"
              }
            >
              {editingUser && (
                <UserEditForm
                  scope="admin"
                  callerRole={currentUser.userRole}
                  user={editingUser}
                  onSaved={handleUserSaved}
                  onCancel={() => setEditingUser(null)}
                />
              )}
            </Modal>
          </>
        );
      case "subjects":
        return (
          <>
            <h3>Manage Subjects</h3>
            {isCreatingSubject ? (
              <SubjectCreateForm
                professors={users.filter(
                  (u) => u.userRole === USER_ROLES.Professor
                )}
                onSave={handleCreateSubject}
                onCancel={() => setIsCreatingSubject(false)}
              />
            ) : editingSubject ? (
              <SubjectEditForm
                subject={editingSubject}
                professors={users.filter(
                  (u) => u.userRole === USER_ROLES.Professor
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
                    Create New Subject
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
            <h3>Student Enrollments</h3>
            {isCreatingEnrollment ? (
              <EnrollmentCreateForm
                students={users.filter((u) => u.userRole === USER_ROLES.Student)}
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
                    Create New Enrollment
                  </button>
                </div>
                <EnrollmentsTable enrollments={enrollments} />
              </>
            )}
          </>
        );
      case "escalations":
        return <EscalationsTab />;
      default:
        return null;
    }
  };
  return (
    <div className="container mt-4">
      <h2>Admin Dashboard</h2>
      <h4 className="mb-4">Welcome, {currentUser.firstName}!</h4>
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "subjects" ? "active" : ""}`}
            onClick={() => setActiveTab("subjects")}
          >
            Subjects
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${
              activeTab === "enrollments" ? "active" : ""
            }`}
            onClick={() => setActiveTab("enrollments")}
          >
            Enrollments
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "escalations" ? "active" : ""}`}
            onClick={() => setActiveTab("escalations")}
          >
            Escalations
          </button>
        </li>
      </ul>
      {renderContent()}
    </div>
  );
};
export default AdminDashboardPage;
