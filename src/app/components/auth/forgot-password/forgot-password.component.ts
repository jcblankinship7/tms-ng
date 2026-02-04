import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, ForgotPasswordRequest } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';
  tokenSent = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const request: ForgotPasswordRequest = {
      email: this.form.value.email
    };

    this.authService.forgotPassword(request).subscribe({
      next: () => {
        this.loading = false;
        this.tokenSent = true;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Failed to send reset link.';
      }
    });
  }
}
