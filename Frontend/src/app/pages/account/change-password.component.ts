import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Changement de mot de passe (Reactive Form).
 * Demande l'ancien mot de passe et la confirmation du nouveau.
 */
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="container" style="max-width:520px">
        <div class="page-head"><h1>Changer de mot de passe</h1><p class="sub">Sécurisez votre compte avec un mot de passe fort.</p></div>

        <div class="card card-pad">
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="form-group">
              <label class="form-label">Mot de passe actuel <span class="req">*</span></label>
              <input type="password" formControlName="old_password" class="form-control" [class.is-invalid]="invalid('old_password')" autocomplete="current-password">
              @if (invalid('old_password')) { <p class="field-error">Ce champ est obligatoire.</p> }
            </div>
            <div class="form-group">
              <label class="form-label">Nouveau mot de passe <span class="req">*</span></label>
              <input type="password" formControlName="new_password" class="form-control" [class.is-invalid]="invalid('new_password')" autocomplete="new-password">
              @if (invalid('new_password')) { <p class="field-error">Au moins 8 caractères.</p> }
            </div>
            <div class="form-group">
              <label class="form-label">Confirmer le nouveau mot de passe <span class="req">*</span></label>
              <input type="password" formControlName="new_password_confirm" class="form-control" [class.is-invalid]="mismatch()" autocomplete="new-password">
              @if (mismatch()) { <p class="field-error">Les mots de passe ne correspondent pas.</p> }
            </div>
            <button type="submit" class="btn btn-primary btn-block" [disabled]="submitting()">
              @if (submitting()) { <span class="spinner"></span> Modification… }
              @else { Mettre à jour le mot de passe }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  submitting = signal(false);

  form = this.fb.nonNullable.group({
    old_password: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    new_password_confirm: ['', [Validators.required]],
  }, { validators: [matchNew] });

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  mismatch(): boolean {
    const c = this.form.controls.new_password_confirm;
    return !!this.form.errors?.['mismatch'] && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.auth.changePassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.notify.success('Mot de passe modifié avec succès.');
        this.submitting.set(false);
        this.router.navigate([this.auth.homeRoute()]);
      },
      error: () => this.submitting.set(false),
    });
  }
}

function matchNew(group: AbstractControl): ValidationErrors | null {
  const a = group.get('new_password')?.value;
  const b = group.get('new_password_confirm')?.value;
  return a && b && a !== b ? { mismatch: true } : null;
}
