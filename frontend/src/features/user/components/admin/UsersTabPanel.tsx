import React, { useState, useEffect, useCallback } from "react";
import { getAllUsers, addUser, deleteUser } from "../../api/userService";
import type { AddUserResult } from "../../api/userService";
import type { User, CreateUser } from "../../../../shared/models/User";
import type { UserRole } from "../../../../shared/constants/constants";
import Modal from "../../../../components/ui/Modal";
import UsersTable from "./UsersTable";
import UserEditForm from "./UserEditForm";
import UserCreateForm from "./UserCreateForm";
import Pagination from "../../../../components/ui/Pagination";

const PAGE_SIZE_OPTIONS = [15, 20, 50];
const DEFAULT_PAGE_SIZE = 15;

type Props = {
  currentUserId: string;
  callerRole: UserRole;
};

const UsersTabPanel: React.FC<Props> = ({ currentUserId, callerRole }) => {
  const [items, setItems] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPage = useCallback(async (p: number, ps: number) => {
    const result = await getAllUsers(p, ps);
    if (result) {
      setItems(result.items);
      setTotalCount(result.totalCount);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, DEFAULT_PAGE_SIZE);
  }, [fetchPage]);

  const handleCreate = async (newUser: CreateUser): Promise<AddUserResult> => {
    const result = await addUser(newUser);
    if (result.ok) {
      setIsCreating(false);
      await fetchPage(page, pageSize);
    }
    return result;
  };

  const handleSaved = async (updatedUser: User) => {
    setItems(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
  };

  const handleDelete = async (userId: string) => {
    const isSuccess = await deleteUser(userId);
    if (isSuccess) {
      await fetchPage(page, pageSize);
      alert("User deleted successfully.");
    } else {
      alert("Failed to delete user.");
    }
  };

  const handlePageChange = async (p: number) => {
    setPage(p);
    await fetchPage(p, pageSize);
  };

  const handlePageSizeChange = async (ps: number) => {
    setPage(1);
    setPageSize(ps);
    await fetchPage(1, ps);
  };

  return (
    <>
      <h3>Manage Users</h3>
      {isCreating ? (
        <UserCreateForm
          onSave={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        <>
          <div className="d-flex justify-content-end mb-3">
            <button
              className="btn btn-success"
              onClick={() => setIsCreating(true)}
            >
              Create New User
            </button>
          </div>
          <UsersTable
            users={items}
            currentUserId={currentUserId}
            onDeleteUser={handleDelete}
            onStartEdit={(userToEdit) => setEditingUser(userToEdit)}
          />
          {totalCount >= 1 && (
            <div className="mt-3">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={totalCount}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
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
            callerRole={callerRole}
            user={editingUser}
            onSaved={handleSaved}
            onCancel={() => setEditingUser(null)}
          />
        )}
      </Modal>
    </>
  );
};

export default UsersTabPanel;
