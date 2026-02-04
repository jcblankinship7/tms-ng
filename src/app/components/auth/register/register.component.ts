import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  getPasswordError(): string {
    const ctrl = this.form.get('password');
    if (ctrl?.hasError('required')) return 'Password is required';
    if (ctrl?.hasError('minlength')) return 'Password must be at least 8 characters';
    return 'Invalid password';
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: RegisterRequest = {
      email: this.form.value.email,
      password: this.form.value.password,
      confirmPassword: this.form.value.confirmPassword,
      firstName: this.form.value.firstName,
      lastName: this.form.value.lastName
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMessage = response.message || 'Registration successful! Please check your email to confirm your account.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.extractErrorMessage(error);
      }
    });
  }

  private extractErrorMessage(error: any): string {
    // Handle ModelState validation errors from ASP.NET Core
    if (error.error && typeof error.error === 'object') {
      // Check for ModelState format (validation errors)
      const errorMessages: string[] = [];
      
      for (const key in error.error) {
        if (key !== 'type' && key !== 'title' && key !== 'status' && key !== 'traceId') {
          const value = error.error[key];
          if (Array.isArray(value)) {
            errorMessages.push(...value);
          } else if (typeof value === 'string') {
            errorMessages.push(value);
          }
        }
      }

      if (errorMessages.length > 0) {
        return errorMessages.join('; ');
      }

      // Check for message field
      if (error.error.message) {
        return error.error.message;
      }
    }

    // Fallback error message
    return 'Registration failed. Please try again.';
  }
}
