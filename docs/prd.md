🚀 Documento de Requisitos do Produto (PRD) – AtomTech Indicações

Versão: 1.0 (PT-BR + Int8 + Estrutura SaaS)

🧠 Visão Geral (Overview)

O projeto consiste no desenvolvimento da plataforma AtomTech Indicações, uma aplicação web onde usuários podem indicar pessoas ou empresas e receber comissões por negócios fechados.

A aplicação será estruturada como um sistema SaaS com foco em:

aquisição de usuários via landing page
ativação imediata (primeira indicação)
acompanhamento de ganhos via dashboard

O objetivo técnico é construir um sistema escalável utilizando:

PostgreSQL com JSONB para flexibilidade
fluxo orientado a conversão
interface moderna focada em dados financeiros
🎯 Metas do Projeto
Conversão
Usuário deve entender a proposta em menos de 5 segundos
Usuário deve conseguir enviar a primeira indicação em menos de 1 minuto
Simplicidade
Fluxo reduzido: cadastro → indicação → acompanhamento
Interface sem complexidade desnecessária
Escalabilidade
Estrutura de dados preparada para múltiplos tipos de leads
Suporte futuro a múltiplas empresas e produtos
Performance
Uso de React Query para cache e sincronização
Identificadores int8 para indexação eficiente
🧱 Stack Tecnológica

Frontend:

React
Vite
TypeScript

UI:

Tailwind CSS
Shadcn/UI
Lucide React (ícones)

Estado:

TanStack Query

Backend (futuro):

Supabase

Banco:

PostgreSQL

Auth:

Supabase Auth
🔄 Estrutura de Páginas e Fluxo
A. Landing Page (/)

Objetivo: conversão

Seções:

Hero (ganho direto)
Como funciona (3 passos)
Prova social
Objeções
CTA final
B. Cadastro (/auth)
Nome
WhatsApp
Senha ou Magic Link
C. Onboarding (Pós-cadastro)

Fluxo obrigatório:

Cadastro → Primeira Indicação → Confirmação → Dashboard

Tela:

Sem menu
Foco total em envio de indicação
D. Dashboard (/app)

Visão do usuário:

Blocos:
Ganhos totais
Ganhos do mês
Em andamento
Disponível para saque
Ações:
Nova indicação
Acompanhar status
Elementos:
Funil de conversão
Lista de indicações
Histórico de comissões
🧩 Modelo de Dados (Schema)
Tabela: usuarios
id int8 PK
usuario_id uuid (auth.users)
nome text
whatsapp text
created_at timestamptz
Tabela: indicacoes
id int8 PK
usuario_id int8 FK
nome_indicado text
whatsapp text
tipo text -- 'pessoa' | 'empresa'
status text -- 'enviado', 'analise', 'negociacao', 'fechado', 'perdido'
valor_potencial numeric
valor_comissao numeric
created_at timestamptz
Tabela: comissoes
id int8 PK
indicacao_id int8 FK
usuario_id int8 FK
valor numeric
status text -- 'pendente', 'disponivel', 'pago'
created_at timestamptz
Tabela: atividades (log)
id int8 PK
usuario_id int8 FK
tipo text
descricao text
created_at timestamptz
🔐 Segurança (RLS)
usuarios
SELECT: auth.uid() = usuario_id
UPDATE: auth.uid() = usuario_id
indicacoes
exists (
  select 1 from usuarios
  where usuarios.id = indicacoes.usuario_id
  and usuarios.usuario_id = auth.uid()
)
comissoes

Mesma lógica de ownership via usuario_id

🎨 UI/UX Guidelines (IDENTIDADE ATOMTECH)
Tema
Light mode (principal)
Clean SaaS
Cores
Verde: ação e ganho
Branco: base
Cinza: suporte
Amarelo: destaque financeiro
Componentes
Cards
rounded-xl
shadow-sm
bg-white
Destaque financeiro
números grandes
cor verde
peso tipográfico alto
Botões
primário: verde sólido
secundário: outline
Layout Dashboard
Sidebar | Conteúdo principal
Hierarquia visual
Ganho (💰)
Ação (CTA)
Status
Histórico
⚡ Experiência do Usuário
Regra principal:

O usuário deve agir antes de explorar

Fluxo ideal:
Landing
↓
Cadastro
↓
Enviar indicação
↓
Receber feedback
↓
Dashboard
Elementos psicológicos
Feedback imediato
Progresso visual
Expectativa de ganho
🧪 Dados Mockados (para front)
nomes brasileiros
valores entre R$200–R$1500
status variados
datas recentes
⚠️ Regras Críticas
NÃO criar complexidade desnecessária
NÃO priorizar features sobre conversão
FOCO total em:
ganho
simplicidade
ação
🎯 Resultado Esperado

Uma aplicação que:

parece um produto SaaS real
comunica valor financeiro instantaneamente
guia o usuário para ação imediata
permite futura integração com backend