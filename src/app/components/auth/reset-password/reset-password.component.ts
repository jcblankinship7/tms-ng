import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, ResetPasswordRequest } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  email = '';
  token = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get email and token from query params
    this.email = this.route.snapshot.queryParams['email'] || '';
    this.token = this.route.snapshot.queryParams['token'] || '';

    if (!this.email || !this.token) {
      this.errorMessage = 'Invalid reset link. Please request a new one.';
      return;
    }

    this.form = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  getPasswordError(): string {
    const ctrl = this.form.get('newPassword');
    if (ctrl?.hasError('required')) return 'Password is required';
    if (ctrl?.hasError('minlength')) return 'Password must be at least 8 characters';
    return 'Invalid password';
  }

  onSubmit(): void {
    if (this.form.invalid || !this.email || !this.token) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: ResetPasswordRequest = {
      email: this.email,
      token: this.token,
      newPassword: this.form.value.newPassword,
      confirmPassword: this.form.value.confirmPassword
    };

    this.authService.resetPassword(request).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Password reset successfully! Redirecting to login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Password reset failed. Please try again.';
      }
    });
  }
}
