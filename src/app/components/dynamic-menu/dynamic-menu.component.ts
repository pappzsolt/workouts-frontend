// src/app/components/dynamic-menu/dynamic-menu.component.ts

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input } from '@angular/core';

export interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
  open?: boolean; // toggle állapot
}

@Component({
  selector: 'app-dynamic-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dynamic-menu.component.html',
  styleUrls: ['./dynamic-menu.component.css']
})
export class DynamicMenuComponent {
  @Input() menuItems: MenuItem[] = [];

  toggle(item: MenuItem) {
    item.open = !item.open;
  }

  isOpen(item: MenuItem): boolean {
    return item.open ?? false;
  }
}
