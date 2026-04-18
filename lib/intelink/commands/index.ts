/**
 * Commands Index - INTELINK Bot
 *
 * Exporta e registra todos os comandos do bot
 */

import { commandRegistry } from './registry';
import { Command } from './types';

// Import commands
import { helpCommand } from './help';
import { startCommand, devCommand } from './start';
import { investigacoesCommand } from './investigacoes';
import { buscarCommand } from './buscar';
import { equipeCommand } from './equipe';
import { exportarCommand } from './exportar';
import { quemCommand } from './quem';
import { grafoCommand } from './grafo';
import { modeloCommand } from './modelo';
import { analisarCommand } from './analisar';
import { comandosCommand } from './comandos';
import { achadosCommand } from './achados';
import { relatorioCommand } from './relatorio';
import { inserirCommand } from './inserir';
import { limparCommand } from './limpar';
import { vincularCommand } from './vincular';
import { fonteCommand } from './fonte';
import { agenteCommand, sairCommand } from './agente';
import { sugerirCommand, hasSugerirSession, handleSugerirMessage, handleSugerirCallback } from './sugerir';
import { observacaoCommand, aprovarObsCommand } from './observacao';
import { ingerirCommand } from './ingerir';
import { fotosPendentesCommand, fotoRevisarCommand, fotoMergeCommand, fotoRejeitarCommand } from './fotos';
import { redsImportarCommand } from './reds-importar';
import { critCommand } from './crit';
import { vinculosCommand } from './vinculos';
import { gruposCommand } from './grupos';
import { alertaCommand } from './alerta';

// ============================================
// ALL COMMANDS (33 registered)
// ============================================

const allCommands: Command[] = [
    helpCommand,
    startCommand,
    devCommand,
    investigacoesCommand,
    buscarCommand,
    equipeCommand,
    exportarCommand,
    quemCommand,
    grafoCommand,
    modeloCommand,
    analisarCommand,
    comandosCommand,
    achadosCommand,
    relatorioCommand,
    inserirCommand,
    limparCommand,
    vincularCommand,
    fonteCommand,
    agenteCommand,
    sairCommand,
    sugerirCommand,
    observacaoCommand,
    aprovarObsCommand,
    ingerirCommand,
    fotosPendentesCommand,
    fotoRevisarCommand,
    fotoMergeCommand,
    fotoRejeitarCommand,
    redsImportarCommand,
    critCommand,
    vinculosCommand,
    gruposCommand,
    alertaCommand,
];

// Register all commands
commandRegistry.registerAll(allCommands);

// ============================================
// EXPORTS
// ============================================

export { commandRegistry, parseCommand } from './registry';
export type { Command, CommandContext, CommandDependencies } from './types';
export { VISUAL } from './types';

// Re-export individual commands for direct usage
export { helpCommand } from './help';
export { startCommand, devCommand } from './start';
export { agenteCommand, sairCommand, isAgentActive, handleAgentMessage, deactivateAgent } from './agente';
export { sugerirCommand, hasSugerirSession, handleSugerirMessage, handleSugerirCallback } from './sugerir';
export { observacaoCommand, aprovarObsCommand } from './observacao';
export { ingerirCommand } from './ingerir';

export default commandRegistry;
