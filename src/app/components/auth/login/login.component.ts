import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService, LoginRequest } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      emailOrUsername: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const request: LoginRequest = this.form.value;

    this.authService.login(request).subscribe({
      next: (response) => {
        this.loading = false;
        this.redirectByPersona();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  private redirectByPersona(): void {
    const persona = this.authService.getPersona();

    const routes: { [key: string]: string } = {
      'Customer': '/dashboard',
      'ServiceProvider': '/provider/orders',
      'Admin': '/dashboard',
      'MarketingManager': '/dashboard',
      'SalesRep': '/dashboard',
      'BillingClerk': '/dashboard',
      'SettlementsClerk': '/dashboard'
    };

    const redirectUrl = routes[persona || 'Customer'] || '/dashboard';
    this.router.navigateByUrl(this.returnUrl || redirectUrl);
  }
}
