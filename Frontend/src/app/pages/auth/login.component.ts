import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

/**
 * Page de connexion (Reactive Form).
 * Email + mot de passe, validation côté client, redirection selon le rôle.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page auth-page">
      <div class="container">
        <div class="auth-grid">
          <!-- Présentation -->
          <div class="auth-aside">
            <a routerLink="/" class="aside-brand">Job<span>Offer</span></a>
            <h2>Bon retour parmi nous 👋</h2>
            <p>Connectez-vous pour gérer vos candidatures, suivre vos offres et accéder à votre espace personnalisé.</p>
            <ul class="aside-list">
              <li>✓ Suivi de vos candidatures en temps réel</li>
              <li>✓ Profil et CV centralisés</li>
              <li>✓ Candidature en un clic</li>
            </ul>
          </div>

          <!-- Formulaire -->
          <div class="card card-pad auth-card fade-in">
            <h1 class="auth-title">Connexion</h1>
            <p class="text-muted mb-3">Entrez vos identifiants pour continuer.</p>

            <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="form-group">
                <label class="form-label" for="email">Email <span class="req">*</span></label>
                <div class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.8"/></svg>
                  <input id="email" type="email" formControlName="email" class="form-control"
                         [class.is-invalid]="invalid('email')" placeholder="vous@exemple.com" autocomplete="email">
                </div>
                @if (invalid('email')) {
                  <p class="field-error">
                    @if (form.controls.email.errors?.['required']) { L'email est obligatoire. }
                    @else { Format d'email invalide. }
                  </p>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Mot de passe <span class="req">*</span></label>
                <div class="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" stroke-width="1.8"/></svg>
                  <input id="password" [type]="show() ? 'text' : 'password'" formControlName="password" class="form-control"
                         [class.is-invalid]="invalid('password')" placeholder="••••••••" autocomplete="current-password" style="padding-right:44px">
                  <button type="button" class="toggle-pwd" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Masquer' : 'Afficher'">
                    {{ show() ? '🙈' : '👁️' }}
                  </button>
                </div>
                @if (invalid('password')) { <p class="field-error">Le mot de passe est obligatoire.</p> }
              </div>

              <button type="submit" class="btn btn-primary btn-block btn-lg mt-2" [disabled]="submitting()">
                @if (submitting()) { <span class="spinner"></span> Connexion… }
                @else { Se connecter }
              </button>
            </form>

            <p class="text-center mt-3 mb-0 text-sm">
              Pas encore de compte ? <a routerLink="/inscription" class="fw-700">Inscrivez-vous</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { display: flex; align-items: center; }
    .auth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; max-width: 980px; margin: 0 auto; background: #fff; border-radius: var(--radius-xl); overflow: hidden; box-shadow: var(--shadow-lg); border: 1px solid var(--border); }
    .auth-aside { background: linear-gradient(150deg, var(--blue-700), var(--blue-600)); color: #fff; padding: 48px; display: flex; flex-direction: column; justify-content: center; }
    .aside-brand { color: #fff; font-weight: 800; font-size: 1.5rem; margin-bottom: 28px; }
    .aside-brand span { color: var(--orange-400); }
    .auth-aside h2 { color: #fff; }
    .auth-aside p { color: rgba(255,255,255,.9); }
    .aside-list { list-style: none; margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }
    .aside-list li { color: rgba(255,255,255,.95); font-weight: 500; }
    .auth-card { border: none; border-radius: 0; box-shadow: none; padding: 48px; }
    .auth-title { margin-bottom: 4px; }
    .toggle-pwd { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.05rem; padding: 4px; }
    @media (max-width: 820px) { .auth-grid { grid-template-columns: 1fr; } .auth-aside { display: none; } .auth-card { padding: 36px 24px; } }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);

  show = signal(false);
  submitting = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.notify.success('Connexion réussie. Bienvenue !');
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || this.auth.homeRoute());
      },
      error: () => this.submitting.set(false),
    });
  }
}
