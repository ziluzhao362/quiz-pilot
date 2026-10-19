import { Routes, Route } from 'react-router';
import QuizLanding from './pages/QuizLanding';
import QuizFlow from './pages/QuizFlow';
import QuizResultPage from './pages/QuizResult';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<QuizLanding />} />
      <Route path="/quiz" element={<QuizFlow />} />
      <Route path="/result" element={<QuizResultPage />} />
      <Route path="*" element={<QuizLanding />} />
    </Routes>
  );
}
