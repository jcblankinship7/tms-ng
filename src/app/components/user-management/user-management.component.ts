import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { User, UserPersona } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
    // Expose UserPersona enum to template
    get UserPersonaEnum() {
      return UserPersona;
    }
  // Signals and state
  users = signal<User[]>([]);
  searchQuery = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  editingUserId = signal<string | null>(null);
  editingPersona = signal<UserPersona | null>(null);
  editingEmail = signal<string | null>(null);
  editingUserName = signal<string | null>(null);
  editingFirstName = signal<string | null>(null);
  editingLastName = signal<string | null>(null);
  confirmingEmailUserId = signal<string | null>(null);

  // Modal state for custom delete confirmation
  showDeleteModal = signal(false);
  userIdToDelete = signal<string | null>(null);

  // Toast state
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');
  private toastTimeout: any = null;

  personas = [
    { value: UserPersona.Customer, label: 'Customer' },
    { value: UserPersona.ServiceProvider, label: 'Service Provider' },
    { value: UserPersona.Admin, label: 'Admin' },
    { value: UserPersona.MarketingManager, label: 'Marketing Manager' },
    { value: UserPersona.SalesRep, label: 'Sales Representative' },
    { value: UserPersona.SettlementsClerk, label: 'Settlements Clerk' },
    { value: UserPersona.BillingClerk, label: 'Billing Clerk' },
    { value: UserPersona.OperationClerk, label: 'Operation Clerk' }
  ];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load users');
        this.loading.set(false);
        console.error('Error loading users:', err);
      }
    });
  }

  showToast(message: string, type: "success" | "error" = "success"): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  getPersonaLabel(persona: UserPersona): string {
    const found = this.personas.find(p => p.value === persona);
    return found ? found.label : 'Unknown';
  }

  filteredUsers(): User[] {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users();
    
    return this.users().filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const userName = user.userName.toLowerCase();
      const personaLabel = this.getPersonaLabel(user.persona).toLowerCase();
      
      return fullName.includes(query) || 
             email.includes(query) || 
             userName.includes(query) || 
             personaLabel.includes(query);
    });
  }

  startEdit(user: User): void {
    this.editingUserId.set(user.id);
    this.editingPersona.set(user.persona);
    this.editingEmail.set(user.email);
    this.editingUserName.set(user.userName);
    this.editingFirstName.set(user.firstName);
    this.editingLastName.set(user.lastName);
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
    this.editingPersona.set(null);
    this.editingEmail.set(null);
    this.editingUserName.set(null);
    this.editingFirstName.set(null);
    this.editingLastName.set(null);
  }

  saveUser(userId: string): void {
    const newPersona = this.editingPersona();
    const newEmail = this.editingEmail();
    const newUserName = this.editingUserName();
    const newFirstName = this.editingFirstName();
    const newLastName = this.editingLastName();
    if (newPersona === null || !newEmail || !newUserName || !newFirstName || !newLastName) return;

    // Always send persona as a number
    const payload = {
      persona: typeof newPersona === 'string' ? parseInt(newPersona, 10) : newPersona,
      email: newEmail,
      userName: newUserName,
      firstName: newFirstName,
      lastName: newLastName
    };
    console.log('UpdateUser payload:', payload);
    this.userService.updateUser(userId, payload).subscribe({
      next: () => {
        this.editingUserId.set(null);
        this.editingPersona.set(null);
        this.editingEmail.set(null);
        this.editingUserName.set(null);
        this.editingFirstName.set(null);
        this.editingLastName.set(null);
        this.loadUsers();
        this.showToast('User updated successfully', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to update user', 'error');
        console.error('Error updating user:', err);
      }
    });
  }

  isEditing(userId: string): boolean {
    return this.editingUserId() === userId;
  }

  setEmailConfirmed(userId: string, confirmed: boolean): void {
    this.userService.setEmailConfirmed(userId, { emailConfirmed: confirmed }).subscribe({
      next: () => {
        this.confirmingEmailUserId.set(null);
        this.loadUsers();
        this.showToast('Email confirmation updated', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to update email confirmation', 'error');
        console.error('Error updating email confirmation:', err);
      }
    });
  }

  requestDeleteUser(userId: string): void {
    this.userIdToDelete.set(userId);
    this.showDeleteModal.set(true);
  }

  confirmDeleteUser(): void {
    const userId = this.userIdToDelete();
    if (!userId) return;
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.userIdToDelete.set(null);
        this.loadUsers();
        this.showToast('User deleted successfully', 'success');
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Failed to delete user', 'error');
        this.showDeleteModal.set(false);
        this.userIdToDelete.set(null);
        console.error('Error deleting user:', err);
      }
    });
  }

  cancelDeleteUser(): void {
    this.showDeleteModal.set(false);
    this.userIdToDelete.set(null);
  }
}
