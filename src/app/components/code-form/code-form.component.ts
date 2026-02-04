import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CodeService } from '../../services/code.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-code-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './code-form.component.html',
  styleUrls: ['./code-form.component.scss']
})
export class CodeFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  codeId: number | null = null;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private codeService: CodeService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      type: ['', [Validators.required, Validators.maxLength(100)]],
      value: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.isEdit = true;
      this.codeId = +idParam;
      this.loadCode(this.codeId);
    }
  }

  loadCode(id: number): void {
    this.loading = true;
    this.codeService.getCode(id).subscribe({
      next: (code) => {
        this.form.patchValue({
          type: code.type,
          value: code.value,
          description: code.description
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load code';
        this.loading = false;
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const payload = this.form.value;

    const request = this.isEdit && this.codeId
      ? this.codeService.updateCode(this.codeId, payload)
      : this.codeService.createCode(payload);

    request.subscribe({
      next: () => this.router.navigate(['/admin/codes']),
      error: (err) => {
        this.error = err.error?.message || `Failed to ${this.isEdit ? 'update' : 'create'} code`;
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/codes']);
  }

  getError(field: string): string | null {
    const control = this.form.get(field);
    if (!control || !control.touched || !control.errors) return null;

    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) return `Max length is ${control.errors['maxlength'].requiredLength}`;
    return 'Invalid value';
  }
}
