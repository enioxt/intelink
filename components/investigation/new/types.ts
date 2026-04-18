/**
 * Types for New Investigation page components
 */

import type { EntityInput } from '../entity-forms/types';
export type { EntityInput };

export interface PoliceUnit {
    id: string;
    code: string;
    name: string;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    unit_id: string;
    telegram_username?: string;
}

export interface Attachment {
    id: string;
    type: 'ocorrencia' | 'relatorio' | 'depoimento' | 'foto' | 'video' | 'documento';
    name: string;
    file?: File;
}

export type TabType = 'info' | 'equipe' | 'entidades' | 'anexos';
export type EntityType = EntityInput['type'];
export type EntityRole = EntityInput['role'];
export type AttachmentType = Attachment['type'];
