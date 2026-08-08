import { Inngest } from 'inngest';

/**
 * Instância global do cliente Inngest para o JurisRadar.
 *
 * Utilizada para criação de functions e serve handler.
 * O `id` deve ser único por aplicação — usado para identificação no painel Inngest.
 */
export const inngest = new Inngest({ id: 'jurisradar' });
