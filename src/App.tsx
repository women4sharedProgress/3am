import { Routes, Route } from 'react-router-dom'
import FeedbackButton          from './components/FeedbackButton'
import Home                    from './pages/Home'
import TrackerPage             from './pages/TrackerPage'
import Login                   from './pages/Login'
import Register                from './pages/Register'
import Settings                from './pages/Settings'
import FontTest                from './pages/FontTest'
import Administration          from './pages/Administration'
import PresidentialCandidates  from './pages/PresidentialCandidates'
import Changelog               from './pages/Changelog'
import About                   from './pages/About'
import Profile                 from './pages/Profile'
import Alerts                  from './pages/Alerts'
import Watching                from './pages/Watching'
import Archive                 from './pages/Archive'
import AlertSettings           from './pages/AlertSettings'
import EnactedLegislation      from './pages/EnactedLegislation'
import ResetPassword           from './pages/ResetPassword'
import OpenSource             from './pages/OpenSource'

export default function App() {
  return (
    <>
    <FeedbackButton />
    <Routes>
      <Route path="/"                        element={<Home />} />
      <Route path="/tracker"                 element={<TrackerPage />} />
      <Route path="/login"                   element={<Login />} />
      <Route path="/register"               element={<Register />} />
      <Route path="/settings"               element={<Settings />} />
      <Route path="/fonttest"               element={<FontTest />} />
      <Route path="/administration"         element={<Administration />} />
      <Route path="/presidential-candidates" element={<PresidentialCandidates />} />
      <Route path="/changelog"              element={<Changelog />} />
      <Route path="/about"                  element={<About />} />
      <Route path="/profile"                element={<Profile />} />
      <Route path="/alerts"                 element={<Alerts />} />
      <Route path="/watching"               element={<Watching />} />
      <Route path="/archive"               element={<Archive />} />
      <Route path="/alerts/settings"       element={<AlertSettings />} />
      <Route path="/enacted-legislation"  element={<EnactedLegislation />} />
      <Route path="/reset-password"       element={<ResetPassword />} />
      <Route path="/open-source"          element={<OpenSource />} />
    </Routes>
    </>
  )
}
