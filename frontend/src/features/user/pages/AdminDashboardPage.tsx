import React, { useState, useEffect, useCallback } from "react";
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
import Pagination from "../../../components/ui/Pagination";

const PAGE_SIZE_OPTIONS = [15, 20, 50];
const DEFAULT_PAGE_SIZE = 15;
const FORM_FETCH_PAGE_SIZE = 50;

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useUserStore();
  const [activeTab, setActiveTab] = useState("users");

  // Users tab
  const [usersItems, setUsersItems] = useState<User[]>([]);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Subjects tab
  const [subjectsItems, setSubjectsItems] = useState<Subject[]>([]);
  const [subjectsTotalCount, setSubjectsTotalCount] = useState(0);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const [subjectsPageSize, setSubjectsPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Enrollments tab
  const [enrollmentsItems, setEnrollmentsItems] = useState<Enrollment[]>([]);
  const [enrollmentsTotalCount, setEnrollmentsTotalCount] = useState(0);
  const [enrollmentsPage, setEnrollmentsPage] = useState(1);
  const [enrollmentsPageSize, setEnrollmentsPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Separate state for form dropdowns — fetched with max page size
  const [allProfessors, setAllProfessors] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [allSubjectsForForm, setAllSubjectsForForm] = useState<Subject[]>([]);

  // Modal / inline form state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState(false);

  const fetchUsersPage = useCallback(async (page: number, pageSize: number) => {
    const result = await getAllUsers(page, pageSize);
    if (result) {
      setUsersItems(result.items);
      setUsersTotalCount(result.totalCount);
    }
  }, []);

  const fetchSubjectsPage = useCallback(async (page: number, pageSize: number) => {
    const result = await getAllSubjects(page, pageSize);
    if (result) {
      setSubjectsItems(result.items);
      setSubjectsTotalCount(result.totalCount);
    }
  }, []);

  const fetchEnrollmentsPage = useCallback(async (page: number, pageSize: number) => {
    const result = await getAllEnrollments(page, pageSize);
    if (result) {
      setEnrollmentsItems(result.items);
      setEnrollmentsTotalCount(result.totalCount);
    }
  }, []);

  const refreshFormUsers = useCallback(async () => {
    const result = await getAllUsers(1, FORM_FETCH_PAGE_SIZE);
    if (result) {
      setAllProfessors(result.items.filter(u => u.userRole === USER_ROLES.Professor));
      setAllStudents(result.items.filter(u => u.userRole === USER_ROLES.Student));
    }
  }, []);

  const refreshFormSubjects = useCallback(async () => {
    const result = await getAllSubjects(1, FORM_FETCH_PAGE_SIZE);
    if (result) {
      setAllSubjectsForForm(result.items);
    }
  }, []);

  useEffect(() => {
    void fetchUsersPage(1, DEFAULT_PAGE_SIZE);
    void fetchSubjectsPage(1, DEFAULT_PAGE_SIZE);
    void fetchEnrollmentsPage(1, DEFAULT_PAGE_SIZE);
    void refreshFormUsers();
    void refreshFormSubjects();
  }, [fetchUsersPage, fetchSubjectsPage, fetchEnrollmentsPage, refreshFormUsers, refreshFormSubjects]);

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

  const handleCreateUser = async (newUser: CreateUser): Promise<AddUserResult> => {
    const result = await addUser(newUser);
    if (result.ok) {
      setIsCreatingUser(false);
      await fetchUsersPage(usersPage, usersPageSize);
      await refreshFormUsers();
    }
    return result;
  };

  const handleUserSaved = async (updatedUser: User) => {
    setUsersItems(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
    await refreshFormUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const isSuccess = await deleteUser(userId);
    if (isSuccess) {
      await fetchUsersPage(usersPage, usersPageSize);
      await refreshFormUsers();
      alert("User deleted successfully.");
    } else {
      alert("Failed to delete user.");
    }
  };

  const handleCreateSubject = async (newSubject: CreateSubject): Promise<CreateSubjectResult> => {
    const result = await createSubject(newSubject);
    if (result.ok) {
      setIsCreatingSubject(false);
      await fetchSubjectsPage(subjectsPage, subjectsPageSize);
      await refreshFormSubjects();
    }
    return result;
  };

  const handleUpdateSubject = async (updatedSubject: UpdateSubject): Promise<UpdateSubjectResult> => {
    const result = await updateSubject(updatedSubject);
    if (result.ok) {
      setEditingSubject(null);
      await fetchSubjectsPage(subjectsPage, subjectsPageSize);
      await refreshFormSubjects();
    }
    return result;
  };

  const handleCreateEnrollment = async (newEnrollment: CreateEnrollment): Promise<CreateEnrollmentResult> => {
    const result = await createEnrollment(newEnrollment);
    if (result.ok) {
      setIsCreatingEnrollment(false);
      await fetchEnrollmentsPage(enrollmentsPage, enrollmentsPageSize);
    }
    return result;
  };

  const handleUsersPageChange = async (page: number) => {
    setUsersPage(page);
    await fetchUsersPage(page, usersPageSize);
  };

  const handleUsersPageSizeChange = async (pageSize: number) => {
    setUsersPage(1);
    setUsersPageSize(pageSize);
    await fetchUsersPage(1, pageSize);
  };

  const handleSubjectsPageChange = async (page: number) => {
    setSubjectsPage(page);
    await fetchSubjectsPage(page, subjectsPageSize);
  };

  const handleSubjectsPageSizeChange = async (pageSize: number) => {
    setSubjectsPage(1);
    setSubjectsPageSize(pageSize);
    await fetchSubjectsPage(1, pageSize);
  };

  const handleEnrollmentsPageChange = async (page: number) => {
    setEnrollmentsPage(page);
    await fetchEnrollmentsPage(page, enrollmentsPageSize);
  };

  const handleEnrollmentsPageSizeChange = async (pageSize: number) => {
    setEnrollmentsPage(1);
    setEnrollmentsPageSize(pageSize);
    await fetchEnrollmentsPage(1, pageSize);
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
                  users={usersItems}
                  currentUserId={currentUser.id}
                  onDeleteUser={handleDeleteUser}
                  onStartEdit={(userToEdit) => setEditingUser(userToEdit)}
                />
                {usersTotalCount >= 1 && (
                  <div className="mt-3">
                    <Pagination
                      page={usersPage}
                      pageSize={usersPageSize}
                      totalItems={usersTotalCount}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={handleUsersPageChange}
                      onPageSizeChange={handleUsersPageSizeChange}
                    />
                  </div>
                )}
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
                professors={allProfessors}
                onSave={handleCreateSubject}
                onCancel={() => setIsCreatingSubject(false)}
              />
            ) : editingSubject ? (
              <SubjectEditForm
                subject={editingSubject}
                professors={allProfessors}
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
                  subjects={subjectsItems}
                  onStartEdit={(subjectToEdit) => setEditingSubject(subjectToEdit)}
                />
                {subjectsTotalCount >= 1 && (
                  <div className="mt-3">
                    <Pagination
                      page={subjectsPage}
                      pageSize={subjectsPageSize}
                      totalItems={subjectsTotalCount}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={handleSubjectsPageChange}
                      onPageSizeChange={handleSubjectsPageSizeChange}
                    />
                  </div>
                )}
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
                students={allStudents}
                subjects={allSubjectsForForm}
                enrollments={enrollmentsItems}
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
                <EnrollmentsTable enrollments={enrollmentsItems} />
                {enrollmentsTotalCount >= 1 && (
                  <div className="mt-3">
                    <Pagination
                      page={enrollmentsPage}
                      pageSize={enrollmentsPageSize}
                      totalItems={enrollmentsTotalCount}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={handleEnrollmentsPageChange}
                      onPageSizeChange={handleEnrollmentsPageSizeChange}
                    />
                  </div>
                )}
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
            className={`nav-link ${activeTab === "enrollments" ? "active" : ""}`}
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
