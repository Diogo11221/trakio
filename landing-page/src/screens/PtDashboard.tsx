import muscleMap from '../assets/figma/muscle-map-render.jpg';
import logoSmall from '../assets/figma/pt/logo-ring-small.svg';
import areaFill from '../assets/figma/pt/chart-area.svg';
import gridline from '../assets/figma/pt/chart-gridline.svg';
import line from '../assets/figma/pt/chart-line.svg';
import markerEnd from '../assets/figma/pt/chart-marker-end.svg';
import marker from '../assets/figma/pt/chart-marker.svg';
import dotGreen from '../assets/figma/pt/dot-green.svg';
import bell from '../assets/figma/pt/icon-bell.svg';
import chevronDown from '../assets/figma/pt/icon-chevron-down.svg';
import message from '../assets/figma/pt/icon-message.svg';
import search from '../assets/figma/pt/icon-search.svg';
import navMessages from '../assets/figma/pt/nav-messages.svg';
import navNutrition from '../assets/figma/pt/nav-nutrition.svg';
import navOverview from '../assets/figma/pt/nav-overview.svg';
import navPayments from '../assets/figma/pt/nav-payments.svg';
import navPlans from '../assets/figma/pt/nav-plans.svg';
import navStudents from '../assets/figma/pt/nav-students.svg';
import windowChrome from '../assets/figma/pt/window-chrome.svg';
import { Portrait } from './Portrait';
import styles from './PtDashboard.module.css';

const navItems = [
  { label: 'Visão geral', icon: navOverview },
  { label: 'Alunos', icon: navStudents, active: true, badge: '18' },
  { label: 'Planos de treino', icon: navPlans },
  { label: 'Nutrição', icon: navNutrition },
  { label: 'Mensagens', icon: navMessages, badge: '3' },
  { label: 'Pagamentos', icon: navPayments },
] as const;

const kpis = [
  { label: 'Volume semanal', value: '18 420', unit: 'kg', tag: '↑ +6%', volt: true },
  { label: 'Carga máxima · supino inclinado', value: '102,0', unit: 'kg', tag: '↑ +10,9%', volt: true },
  { label: 'Treinos cumpridos · 4 semanas', value: '11/12', unit: 'treinos', tag: '92%' },
  { label: 'Prontidão hoje', value: '78', unit: '/ 100', tag: 'pronto' },
] as const;

const muscles = [
  { name: 'Peito', sets: 14, fill: 40.08, note: 'Alvo 10 · ✓' },
  { name: 'Deltoide ant.', sets: 11, fill: 31.42, note: 'Alvo 8 · ✓' },
  { name: 'Tríceps', sets: 9, fill: 26, note: 'Alvo 8 · ✓' },
  { name: 'Dorsais', sets: 4, fill: 11.38, note: 'Abaixo do alvo · 4/10', low: true },
] as const;

/** 1 = trained, 0 = rest, 2 = missed. Four weeks × seven days. */
const adherence = [
  [1, 0, 1, 0, 1, 0, 0],
  [1, 0, 1, 0, 1, 1, 0],
  [1, 0, 2, 0, 1, 0, 0],
  [1, 0, 1, 0, 1, 0, 0],
] as const;

const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
const axis = ['6 out', '13 out', '20 out', '27 out', '3 nov', '10 nov', '17 nov', '24 nov'] as const;

/** Dashboard PT (web, light) — rendered at 0.54 scale inside a browser window. */
export function PtDashboard() {
  return (
    <div className={styles.window}>
      <img src={windowChrome} alt="" className={styles.chrome} />
      <div className={styles.viewport}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.logoTile}>
              <img src={logoSmall} alt="" />
            </span>
            <span className={styles.brandName}>trakio</span>
            <span className={styles.roleTag}>Treinador</span>
          </div>
          {navItems.map((item) => (
            <div key={item.label} className={styles.navItem} data-active={'active' in item}>
              <img src={item.icon} alt="" />
              <span>{item.label}</span>
              {'badge' in item && (
                <span className={`mono ${styles.badge}`} data-active={'active' in item}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
          <span className={styles.spacer} />
          <div className={styles.marketplace}>
            <span>
              <img src={dotGreen} alt="" />
              Listado no marketplace
            </span>
            <span>Lisboa · Online · 4 €/mês</span>
          </div>
          <div className={styles.coach}>
            <Portrait person="rita" size={18.42} />
            <span>
              <strong>Rita Santos</strong>
              <span>Personal Trainer</span>
            </span>
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.topBar}>
            <span className={styles.breadcrumb}>
              Alunos <span>/</span> <strong>Miguel Costa</strong>
            </span>
            <span className={styles.topActions}>
              <span className={styles.search}>
                <img src={search} alt="" />
                Procurar aluno, plano…
              </span>
              <span className={styles.iconButton}>
                <img src={bell} alt="" />
              </span>
            </span>
          </div>

          <div className={styles.studentHeader}>
            <span className={styles.student}>
              <Portrait person="miguel" size={28.17} />
              <span>
                <strong>Miguel Costa</strong>
                <span className={styles.tags}>
                  <span>Hipertrofia · semana 6 de 12</span>
                  <span>Acompanhado desde set. 2026</span>
                  <span>Último treino: hoje, 10:12</span>
                </span>
              </span>
            </span>
            <span className={styles.studentActions}>
              <span className={styles.ghostButton}>
                <img src={message} alt="" />
                Mensagem
              </span>
              <span className={styles.voltButton}>Editar plano</span>
            </span>
          </div>

          <div className={styles.kpis}>
            {kpis.map((kpi) => (
              <div key={kpi.label} className={styles.kpi}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span className={styles.kpiValue}>
                  <span className="mono">{kpi.value}</span>
                  <span>{kpi.unit}</span>
                  <span className={`mono ${styles.kpiTag}`} data-volt={'volt' in kpi}>
                    {kpi.tag}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className={styles.grid}>
            <div className={styles.mapPanel}>
              <div className={styles.mapHeader}>
                <span>
                  <span>Mapa muscular</span>
                  <strong>Volume desta semana</strong>
                </span>
                <span className={styles.segmented}>
                  <span data-active="true">Volume</span>
                  <span>Cansaço</span>
                </span>
              </div>
              <img className={styles.mapRender} src={muscleMap} alt="Mapa muscular de frente e de costas" />
              <div className={styles.legend}>
                <span>
                  <span className="mono">0</span>
                  <span className={styles.gradient} />
                  <span className="mono">20 séries</span>
                </span>
                <span>Arrasta para rodar</span>
              </div>
              <div className={styles.muscles}>
                {muscles.map((muscle) => (
                  <div key={muscle.name} className={styles.muscle}>
                    <span className={styles.muscleRow}>
                      <span>{muscle.name}</span>
                      <span className="mono" data-low={'low' in muscle}>
                        {muscle.sets}
                      </span>
                    </span>
                    <span className={styles.bar}>
                      <span style={{ width: muscle.fill }} data-low={'low' in muscle} />
                    </span>
                    <span className={styles.muscleNote}>{muscle.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span>
                    <strong>Evolução da carga máxima</strong>
                    <span>Estimada a partir de cada série · últimas 8 semanas</span>
                  </span>
                  <span className={styles.select}>
                    Supino inclinado
                    <img src={chevronDown} alt="" />
                  </span>
                </div>
                <div className={styles.chart}>
                  {[13.33, 43.33, 73.33].map((top) => (
                    <img key={top} src={gridline} alt="" className={styles.gridline} style={{ top: `${top}%` }} />
                  ))}
                  <span className={`mono ${styles.yLabel}`} style={{ top: '9.33%' }}>105</span>
                  <span className={`mono ${styles.yLabel}`} style={{ top: '39.33%' }}>98</span>
                  <span className={`mono ${styles.yLabel}`} style={{ top: '69.33%' }}>91</span>
                  <img src={areaFill} alt="" className={styles.area} />
                  <img src={line} alt="" className={styles.line} />
                  <img src={marker} alt="" className={styles.marker} />
                  <img src={markerEnd} alt="" className={styles.markerEnd} />
                </div>
                <div className={`mono ${styles.axis}`}>
                  {axis.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
              </div>

              <div className={`${styles.panel} ${styles.split}`}>
                <div className={styles.adherence}>
                  <strong>Aderência</strong>
                  <div className={styles.days}>
                    {days.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className={styles.heatmap}>
                    {adherence.map((week, w) => (
                      <div key={w}>
                        {week.map((cell, d) => (
                          <span key={d} data-state={cell} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className={styles.heatLegend}>
                    <span>
                      <span data-state="1" /> Treinou
                    </span>
                    <span>
                      <span data-state="2" /> Falhou
                    </span>
                  </div>
                </div>
                <div className={styles.forecast}>
                  <span className={styles.forecastTag}>
                    <span className="mono">IA</span>
                    Previsão de cansaço
                  </span>
                  <p className={styles.forecastText}>
                    O volume subiu 18% em 3 semanas e o sono está abaixo das 6 horas. Prevemos muito cansaço na
                    quinta-feira.
                  </p>
                  <p className={styles.forecastHint}>
                    Sugestão: uma semana mais leve a partir de 1 de dezembro (menos 40% de volume, mesmo peso).
                  </p>
                  <span className={styles.spacer} />
                  <span className={styles.forecastActions}>
                    <span className={styles.darkButton}>Aplicar semana leve</span>
                    <span className={styles.outlineButton}>Ignorar</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
