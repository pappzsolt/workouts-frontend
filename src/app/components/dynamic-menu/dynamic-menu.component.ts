import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface MenuItem {
  label: string;
  path?: string;
  children?: MenuItem[];
  open?: boolean; // toggle állapot
  action?: string; // pl. logout
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
  @Output() menuAction = new EventEmitter<string>();

  toggle(item: MenuItem) {
    item.open = !item.open;
  }

  isOpen(item: MenuItem): boolean {
    return item.open ?? false;
  }

  onAction(item: MenuItem) {
    if (item.action) {
      this.menuAction.emit(item.action);
    }
  }
}

