import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserRole } from '../../core/models/models';

/**
 * Page d'inscription (Reactive Form).
 * Choix du rôle (Candidat / Recruteur), validation côté client incluant
 * la confirmation du mot de passe (validateur croisé).
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="container" style="max-width:640px">
        <div class="text-center mb-3 fade-in">
          <a routerLink="/" class="reg-brand">Job<span>Offer</span></a>
          <h1 class="mt-2 mb-1">Créer votre compte</h1>
          <p class="text-muted">Rejoignez la communauté JobOffer en moins d'une minute.</p>
        </div>

        <div class="card card-pad fade-in">
          <!-- Choix du rôle -->
          <label class="form-label">Je suis un… <span class="req">*</span></label>
          <div class="role-grid mb-3">
            <button type="button" class="role-card" [class.active]="role() === 'candidate'" (click)="setRole('candidate')">
              <span class="role-emoji">🎯</span>
              <strong>Candidat</strong>
              <span class="text-xs text-muted">Je cherche un emploi</span>
            </button>
            <button type="button" class="role-card" [class.active]="role() === 'recruiter'" (click)="setRole('recruiter')">
              <span class="role-emoji">🏢</span>
              <strong>Recruteur</strong>
              <span class="text-xs text-muted">Je recrute des talents</span>
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label" for="fn">Prénom <span class="req">*</span></label>
                <input id="fn" formControlName="first_name" class="form-control" [class.is-invalid]="invalid('first_name')" placeholder="Awa">
                @if (invalid('first_name')) { <p class="field-error">Le prénom est obligatoire.</p> }
              </div>
              <div class="form-group">
                <label class="form-label" for="ln">Nom <span class="req">*</span></label>
                <input id="ln" formControlName="last_name" class="form-control" [class.is-invalid]="invalid('last_name')" placeholder="Diallo">
                @if (invalid('last_name')) { <p class="field-error">Le nom est obligatoire.</p> }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Email <span class="req">*</span></label>
              <input id="email" type="email" formControlName="email" class="form-control" [class.is-invalid]="invalid('email')" placeholder="vous@exemple.com" autocomplete="email">
              @if (invalid('email')) {
                <p class="field-error">
                  @if (form.controls.email.errors?.['required']) { L'email est obligatoire. }
                  @else { Format d'email invalide. }
                </p>
              }
            </div>

            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label" for="pwd">Mot de passe <span class="req">*</span></label>
                <input id="pwd" type="password" formControlName="password" class="form-control" [class.is-invalid]="invalid('password')" placeholder="••••••••" autocomplete="new-password">
                @if (invalid('password')) {
                  <p class="field-error">
                    @if (form.controls.password.errors?.['required']) { Le mot de passe est obligatoire. }
                    @else { Au moins 8 caractères. }
                  </p>
                }
              </div>
              <div class="form-group">
                <label class="form-label" for="pwd2">Confirmer <span class="req">*</span></label>
                <input id="pwd2" type="password" formControlName="password_confirm" class="form-control" [class.is-invalid]="invalid('password_confirm') || mismatch()" placeholder="••••••••" autocomplete="new-password">
                @if (mismatch()) { <p class="field-error">Les mots de passe ne correspondent pas.</p> }
                @else if (invalid('password_confirm')) { <p class="field-error">Confirmez le mot de passe.</p> }
              </div>
            </div>

            <p class="field-hint mb-2">🔒 Le mot de passe doit contenir au moins 8 caractères et ne pas être trop courant.</p>

            <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="submitting()">
              @if (submitting()) { <span class="spinner"></span> Création… }
              @else { Créer mon compte }
            </button>
          </form>

          <p class="text-center mt-3 mb-0 text-sm">
            Déjà inscrit ? <a routerLink="/connexion" class="fw-700">Connectez-vous</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reg-brand { font-weight: 800; font-size: 1.5rem; color: var(--gray-900); }
    .reg-brand span { color: var(--accent); }
    .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .role-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 20px; border: 2px solid var(--gray-200); border-radius: var(--radius-lg); background: #fff; cursor: pointer; transition: .15s; font-family: inherit; }
    .role-card:hover { border-color: var(--blue-300); background: var(--blue-50); }
    .role-card.active { border-color: var(--blue-600); background: var(--blue-50); box-shadow: 0 0 0 4px var(--blue-100); }
    .role-card strong { color: var(--gray-900); }
    .role-emoji { font-size: 1.8rem; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  role = signal<UserRole>('candidate');
  submitting = signal(false);

  form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['candidate' as UserRole, [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirm: ['', [Validators.required]],
  }, { validators: [matchPasswords] });

  setRole(r: UserRole): void {
    this.role.set(r);
    this.form.controls.role.setValue(r);
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  mismatch(): boolean {
    const c = this.form.controls.password_confirm;
    return !!this.form.errors?.['mismatch'] && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.notify.success('Compte créé avec succès. Vous pouvez vous connecter.');
        this.router.navigate(['/connexion']);
      },
      error: () => this.submitting.set(false),
    });
  }
}

/** Validateur croisé : password === password_confirm. */
function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const confirm = group.get('password_confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}
