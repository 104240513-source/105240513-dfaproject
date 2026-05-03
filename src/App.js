import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import './App.css';

const style = [
  { 
    selector: 'node', 
    style: { 
      'shape': 'ellipse', 'background-color': '#ffffff', 'border-width': 3, 'border-color': '#a2d2ff', 
      'label': 'data(label)', 'text-valign': 'center', 'width': '60px', 'height': '60px', 'font-weight': 'bold', 'font-size': '14px',
      'transition-property': 'background-color, border-color, scale', 'transition-duration': '0.3s'
    } 
  },
  { selector: 'node.highlighted', style: { 'background-color': '#fbbf24 !important', 'border-color': '#f59e0b !important', 'scale': 1.15, 'z-index': 9999, 'underlay-color': '#fbbf24', 'underlay-padding': '8px', 'underlay-opacity': 0.3 } },
  { selector: 'node.error', style: { 'background-color': '#f87171', 'border-color': '#b91c1c' } },
  { selector: 'edge.highlighted', style: { 'line-color': '#fbbf24', 'target-arrow-color': '#fbbf24', 'width': 6, 'z-index': 9999, 'line-style': 'dashed', 'line-dash-pattern': [6, 3], 'line-dash-offset': 20 } },
  { selector: 'node[type = "start"]', style: { 'border-color': '#ffafcc', 'background-color': '#fff5f8' } },
  { selector: 'node[type = "accept"]', style: { 'border-width': 6, 'border-color': '#4a4e69', 'border-style': 'double' } },
  { selector: 'edge', style: { 'width': 3, 'line-color': '#a2d2ff', 'target-arrow-shape': 'triangle', 'label': 'data(label)', 'curve-style': 'bezier', 'font-size': '12px', 'text-background-opacity': 1, 'text-background-color': '#ffffff', 'target-arrow-color': '#a2d2ff' } }
];

function App() {
  const [numStates, setNumStates] = useState(5);
  const [startState, setStartState] = useState('q0');
  const [acceptStates, setAcceptStates] = useState(new Set(['q2']));
  const [transitions, setTransitions] = useState({});
  const [elements, setElements] = useState([]);
  const [testString, setTestString] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentState, setCurrentState] = useState('q0');
  const [history, setHistory] = useState([{ state: 'q0', char: 'Start' }]);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false); // Tính năng mới
  const [equivalenceClasses, setEquivalenceClasses] = useState([]); // Tính năng mới
  const cyRef = useRef(null);

  useEffect(() => {
    const states = Array.from({ length: numStates }, (_, i) => `q${i}`);
    const newElements = states.map(id => ({
      data: { id, label: id, type: id === startState ? 'start' : (acceptStates.has(id) ? 'accept' : 'normal') }
    }));
    Object.keys(transitions).forEach(key => {
      const [source, char] = key.split(',');
      const target = transitions[key];
      if (target) newElements.push({ data: { id: `e-${source}-${char}-${target}`, source, target, label: char } });
    });
    setElements(newElements);
  }, [numStates, startState, acceptStates, transitions]);

  useEffect(() => {
    setCurrentState(startState);
    setCurrentIndex(-1);
    setTestResult(null);
    setHistory([{ state: startState, char: 'Start' }]);
    setActiveEdgeId(null);
    setIsPlaying(false);
  }, [startState, testString]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('highlighted error');
      cyRef.current.$(`#${currentState}`).addClass('highlighted');
      if (activeEdgeId) {
        cyRef.current.$(`#${activeEdgeId}`).addClass('highlighted');
      }
      if (testResult === false) {
        cyRef.current.$(`#${currentState}`).addClass('error');
      }
    }
  }, [currentState, activeEdgeId, testResult, elements]);

  const resetTest = () => {
    setCurrentIndex(-1);
    setCurrentState(startState);
    setTestResult(null);
    setHistory([{ state: startState, char: 'Start' }]);
    setActiveEdgeId(null);
    setIsPlaying(false);
  };

  const stepForward = () => {
    if (currentIndex + 1 < testString.length) {
      const nextIndex = currentIndex + 1;
      const char = testString[nextIndex];
      const nextState = transitions[`${currentState},${char}`];
      if (nextState) {
        setActiveEdgeId(`e-${currentState}-${char}-${nextState}`);
        setHistory(prev => [...prev, { state: nextState, char }]);
        setCurrentState(nextState);
        setCurrentIndex(nextIndex);
        if (nextIndex === testString.length - 1) {
          setTestResult(acceptStates.has(nextState));
          setIsPlaying(false);
        }
        return true;
      } else {
        setTestResult(false);
        setIsPlaying(false);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    let timer;
    if (isPlaying && testResult === null) {
      timer = setTimeout(() => {
        const canStep = stepForward();
        if (!canStep) setIsPlaying(false);
      }, 800);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, currentState]);

  const handleMinimize = () => {
    const states = Array.from({ length: numStates }, (_, i) => `q${i}`);
    const alphabet = ['a', 'b'];
    let marked = new Set();
    for (let i = 0; i < states.length; i++) {
      for (let j = i + 1; j < states.length; j++) {
        const p = states[i], q = states[j];
        if (acceptStates.has(p) !== acceptStates.has(q)) marked.add([p, q].sort().join(','));
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const p = states[i], q = states[j];
          const pair = [p, q].sort().join(',');
          if (!marked.has(pair)) {
            for (const char of alphabet) {
              const pa = transitions[`${p},${char}`], qa = transitions[`${q},${char}`];
              if (pa && qa && pa !== qa) {
                if (marked.has([pa, qa].sort().join(','))) { marked.add(pair); changed = true; break; }
              }
            }
          }
        }
      }
    }
    let groups = [];
    let visited = new Set();
    states.forEach(s => {
      if (!visited.has(s)) {
        let group = [s];
        visited.add(s);
        states.forEach(other => {
          if (!visited.has(other) && !marked.has([s, other].sort().join(','))) {
            group.push(other); visited.add(other);
          }
        });
        groups.push(group);
      }
    });
    setEquivalenceClasses(groups);
  };

  return (
    <div className="pro-container">
      <header className="pro-header">
        <h1>DFA <span>🐰</span></h1>
        <div className="test-panel">
          <input placeholder="Enter string..." value={testString} onChange={(e) => setTestString(e.target.value)} />
          <div className="test-controls">
            <button onClick={resetTest} className="btn-small">RESET</button>
            <button onClick={stepForward} className="btn-run" disabled={testResult !== null || testString === "" || isPlaying}>STEP NEXT</button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="btn-play" disabled={testResult !== null || testString === ""}>
              {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
            </button>
          </div>
          {testResult !== null && (
            <span className={`result-label ${testResult ? 'pass' : 'fail'}`}>{testResult ? "✓ ACCEPTED" : "✗ REJECTED"}</span>
          )}
        </div>
        <div className="header-actions">
          <button onClick={handleMinimize} className="btn-minimize">⚡ MINIMIZE</button>
          <button onClick={() => cyRef.current && cyRef.current.layout({ name: 'circle', animate: true }).run()} className="btn-ghost">🔄 Reset Layout</button>
          <button onClick={() => {
            const link = document.createElement('a'); link.href = cyRef.current.png(); link.download = 'dfa.png'; link.click();
          }} className="btn-export">📸 Export PNG</button>
        </div>
      </header>

      <div className="pro-layout">
        <aside className="pro-sidebar">
          <section className="pro-card">
            <h3>⚙️ Machine Config</h3>
            <label>States: {numStates}</label>
            <input type="range" min="1" max="10" value={numStates} onChange={(e) => setNumStates(parseInt(e.target.value))} />
          </section>

          {equivalenceClasses.length > 0 && (
            <section className="pro-card" style={{borderColor: '#a855f7'}}>
              <h3>💎 Equivalence Classes</h3>
              {equivalenceClasses.map((cls, idx) => (
                <div key={idx} className="class-item">Class {idx + 1}: <span>{`{${cls.join(', ')}}`}</span></div>
              ))}
            </section>
          )}

          <section className="pro-card state-list">
            <h3>📍 State Properties</h3>
            <div>
              {Array.from({ length: numStates }, (_, i) => `q${i}`).map(s => (
                <div key={s} className="state-row">
                  <span className={currentState === s ? "q-label active-now" : "q-label"}>{s}</span>
                  <div className="actions">
                    <button className={startState === s ? "active-start" : ""} onClick={() => setStartState(s)}>S</button>
                    <button className={acceptStates.has(s) ? "active-final" : ""} onClick={() => {
                      const next = new Set(acceptStates); next.has(s) ? next.delete(s) : next.add(s); setAcceptStates(next);
                    }}>F</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pro-card trace-panel">
            <h3>🔍 Input Trace</h3>
            <div className="trace-scroll">
              {history.map((h, i) => (
                <div key={i} className={`trace-row ${i === history.length - 1 ? 'active' : ''}`}>
                  <span className="t-char" style={{color:'#888', width:'20px'}}>{h.char}</span>
                  <span style={{color:'#444'}}>→</span>
                  <span className={currentState === h.state ? "t-state-active" : ""}>{h.state}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="pro-main">
          <section className="pro-card transition-section">
            <h3>📝 Transition Function (δ)</h3>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>δ</th><th>Input 'a'</th><th>Input 'b'</th></tr></thead>
                <tbody>
                  {Array.from({ length: numStates }, (_, i) => `q${i}`).map(s => (
                    <tr key={s}>
                      <td className={currentState === s ? "bold-highlight" : "bold"}>{s}</td>
                      {['a', 'b'].map(char => (
                        <td key={char}>
                          <select value={transitions[`${s},${char}`] || ""} onChange={(e) => setTransitions(p => ({...p, [`${s},${char}`]: e.target.value}))}>
                            <option value="">--</option>
                            {Array.from({ length: numStates }, (_, k) => `q${k}`).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pro-card canvas-section">
            <div className="canvas-container dark-grid">
              <CytoscapeComponent elements={elements} stylesheet={style} cy={(cy) => cyRef.current = cy} style={{width: '100%', height: '100%'}} layout={{ name: 'circle', padding: 50 }} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
