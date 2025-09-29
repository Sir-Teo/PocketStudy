import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import CourseBrowserPage from './pages/CourseBrowser';
import EditorPage from './pages/Editor';
import KnowledgeGraphPage from './pages/KnowledgeGraph';
import SessionPage from './pages/Session';
import StatsPage from './pages/Stats';
import SettingsPage from './pages/Settings';
import { ensureCourseInstalled } from './lib/courseService';
import './App.css';

export default function App() {
  useEffect(() => {
    ensureCourseInstalled('demo').catch((error) => {
      console.error('Failed to ensure demo course installed', error);
    });
  }, []);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <NavLink to="/" className="brand">
          PocketStudy
        </NavLink>
        <nav className="top-nav">
          <NavLink to="/learn">Learn</NavLink>
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/editor">Author</NavLink>
          <NavLink to="/graph">Graph</NavLink>
          <NavLink to="/stats">Stats</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/learn" element={<SessionPage />} />
          <Route path="/courses" element={<CourseBrowserPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/graph" element={<KnowledgeGraphPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="not-found">
      <h1>Not found</h1>
      <p>The page you requested does not exist.</p>
    </div>
  );
}
