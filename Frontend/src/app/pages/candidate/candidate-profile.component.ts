import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { SpinnerComponent } from '../../shared/spinner.component';
import { CandidateProfile, User } from '../../core/models/models';
import { mediaUrl, initials } from '../../core/services/media.util';

/**
 * « Mon profil » candidat : informations personnelles, CV, compétences.
 */
@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [RouterLink, SpinnerComponent],
  template: `
    <div class="page">
      <div class="container" style="max-width:860px">
        <div class="page-head flex items-center justify-between flex-wrap gap-2">
          <div><h1>Mon profil</h1><p class="sub">Vos informations visibles par les recruteurs.</p></div>
          <a routerLink="/candidat/profil/modifier" class="btn btn-primary">✏️ Modifier le profil</a>
        </div>

        @if (loading()) {
          <app-spinner message="Chargement du profil…" />
        } @else {
          <!-- En-tête identité -->
          <div class="card card-pad profile-head">
            <span class="avatar avatar-lg">{{ ini() }}</span>
            <div class="flex-1">
              <h2 class="mb-0">{{ fullName() }}</h2>
              <p class="text-muted mb-2">{{ user()?.email }}</p>
              <div class="flex gap-1 flex-wrap">
                <span class="badge badge-blue">Candidat</span>
                @if (profile()?.location) { <span class="chip">📍 {{ profile()!.location }}</span> }
              </div>
            </div>
          </div>

          <!-- Présentation -->
          <div class="card card-pad mt-3">
            <h3>À propos</h3>
            @if (profile()?.bio) { <p class="pre-line text-muted">{{ profile()!.bio }}</p> }
            @else { <p class="text-muted">Aucune présentation pour le moment. <a routerLink="/candidat/profil/modifier">Ajoutez-en une</a>.</p> }
          </div>

          <div class="grid grid-2 mt-3">
            <!-- Coordonnées -->
            <div class="card card-pad">
              <h3>Coordonnées</h3>
              <ul class="info-list">
                <li><span>📧 Email</span><strong>{{ user()?.email }}</strong></li>
                <li><span>📞 Téléphone</span><strong>{{ profile()?.phone || '—' }}</strong></li>
                <li><span>📍 Localisation</span><strong>{{ profile()?.location || '—' }}</strong></li>
                <li><span>🔗 LinkedIn</span>
                  @if (profile()?.linkedin_url) { <a [href]="profile()!.linkedin_url" target="_blank" rel="noopener">Voir le profil</a> }
                  @else { <strong>—</strong> }
                </li>
                <li><span>🌐 Portfolio</span>
                  @if (profile()?.portfolio_url) { <a [href]="profile()!.portfolio_url" target="_blank" rel="noopener">Visiter</a> }
                  @else { <strong>—</strong> }
                </li>
              </ul>
            </div>

            <!-- CV + compétences -->
            <div class="card card-pad">
              <h3>CV & compétences</h3>
              <div class="cv-box mb-3">
                @if (cvUrl()) {
                  <div class="flex items-center gap-2">
                    <span class="stat-icon blue" style="width:42px;height:42px">📄</span>
                    <div class="flex-1"><strong>CV disponible</strong><p class="text-xs text-muted mb-0">Document téléversé</p></div>
                    <a [href]="cvUrl()!" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Ouvrir</a>
                  </div>
                } @else {
                  <p class="text-muted mb-0">Aucun CV téléversé. <a routerLink="/candidat/profil/modifier">Ajoutez votre CV</a>.</p>
                }
              </div>
              <strong class="text-sm">Compétences</strong>
              <div class="flex gap-1 flex-wrap mt-1">
                @if (skills().length) {
                  @for (s of skills(); track s) { <span class="chip chip-skill">{{ s }}</span> }
                } @else {
                  <span class="text-muted text-sm">Aucune compétence renseignée.</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-head { display: flex; align-items: center; gap: 22px; }
    .info-list { list-style: none; display: flex; flex-direction: column; gap: 13px; }
    .info-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: .9rem; }
    .info-list li span { color: var(--text-muted); }
    .info-list li strong { color: var(--gray-800); text-align: right; }
    .pre-line { white-space: pre-line; }
    .cv-box { background: var(--gray-50); border: 1px dashed var(--gray-300); border-radius: var(--radius); padding: 14px; }
  `],
})
export class CandidateProfileComponent implements OnInit {
  private profileService = inject(ProfileService);
  private auth = inject(AuthService);

  loading = signal(true);
  user = signal<User | null>(null);
  profile = signal<CandidateProfile | null>(null);

  fullName = computed(() => {
    const u = this.user();
    return u ? `${u.first_name} ${u.last_name}`.trim() || u.email : this.auth.fullName();
  });
  ini = () => initials(this.fullName());
  cvUrl = () => mediaUrl(this.profile()?.resume);
  skills = computed(() =>
    (this.profile()?.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (u) => {
        this.user.set(u);
        this.profile.set(u.candidate_profile ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
