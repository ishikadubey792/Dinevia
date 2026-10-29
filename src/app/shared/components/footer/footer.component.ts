import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  newsletterEmail = '';
  readonly subscribed = signal<boolean>(false);

  onNewsletterSubmit(): void {
    if (this.newsletterEmail && this.newsletterEmail.includes('@')) {
      this.subscribed.set(true);
      this.newsletterEmail = '';
      setTimeout(() => this.subscribed.set(false), 5000);
    }
  }
}
