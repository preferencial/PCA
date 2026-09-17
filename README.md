# Painel da Direção de Escola Classe

Sistema de apoio à decisão e à memória de gestão de uma Escola Classe vinculada à Coordenação Regional de Ensino do Plano Piloto (CRE-PP).

O painel registra necessidades, critérios de prioridade, providências internas e encaminhamentos. Ele preserva a distinção entre a discricionariedade da direção, as deliberações colegiadas e as competências da CRE-PP e das áreas centrais da SEEDF.

Os nomes técnicos `PCA_*`, `CategoriaAlimenticia` e `ModalidadeAtendimento` foram mantidos internamente para compatibilidade com a base e as integrações da versão anterior. Na interface, esses campos representam, respectivamente, registros de gestão, competência predominante e grupo impactado.
Todos os componentes estão localizados na pasta raiz deste projeto.


---

## Mapeamento de Schema da Planilha (item 6 — pré-requisito para fixtures analíticos)

> **Status do catálogo AI:** vazio — o `SchemaService` expõe apenas abas de infraestrutura baseline. Nenhuma entidade do domínio PCA (Análise de Componentes Principais) está mapeada. Até que os dados analíticos sejam declarados, o backend não deve apresentar agrupamentos administrativos ou projeções descritivas como fatores latentes descobertos.

### Abas declaradas no SchemaService

| Aba (sheetName) | Entidade | Tipo | Colunas |
|---|---|---|---|
| `Usuarios` | — (login real) | Autenticação | `ID`, `Username`, `Password`, `Role`, `Nome`, `Email`, `CriadoEm` |
| `Users` | USERS | Autenticação (baseline) | `ID`, `Name`, `Email`, `Username`, `PasswordHash`, `Role`, `Status`, `LastLoginAt`, `CreatedAt`, `UpdatedAt` |
| `Settings` | SETTINGS | Configuração/Infra | `Key`, `Value`, `Description`, `Scope`, `UpdatedAt`, `UpdatedBy` |
| `Audit_Logs` | AUDIT_LOGS | Infraestrutura | `ID`, `Timestamp`, `Level`, `Action`, `Entity`, `RecordID`, `UserID`, `Message`, `Details`, `CreatedAt` |

> **Nota de infraestrutura:** O `SchemaService` deste projeto tem lógica especial de `getSpreadsheet_()` — usa `DATABASE_ID` (Script Property) e `getDb()` como fallbacks, chegando a auto-provisionar uma planilha nova como último recurso. Isso indica que a planilha pode não estar vinculada pelo `SPREADSHEET_ID` padrão.

### Entidades pendentes de mapeamento analítico

O schema atual é integralmente composto por abas de infraestrutura. As entidades analíticas do domínio PCA (variáveis observadas, componentes, cargas fatoriais, scores) não estão declaradas.

| Entidade esperada | Por que ausente | O que precisa ser feito |
|---|---|---|
| Variáveis observadas | Não declarada | Mapear as variáveis reais que alimentam a PCA (atributos de alunos, escolas ou preferências) |
| Componentes principais | Não declarada | Declarar entidade com componente, variância explicada, eigenvalue |
| Cargas fatoriais | Não declarada | Declarar entidade com variável, componente, carga |
| Scores de componentes | Não declarada | Declarar entidade com registro (aluno/escola), scores por componente |
| Dados brutos de entrada | Não declarada | Identificar a aba com os dados que são input da PCA |

> **Ação necessária para o item 6:** Inspecionar a planilha vinculada (via `DATABASE_ID` ou `getDb()`) para identificar as abas reais e declarar as entidades no `SchemaService`. A ausência completa de entidades de domínio impede qualquer fixture analítico significativo.
