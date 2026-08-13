import Navbar from './Navbar.jsx'
import IntroSection from './IntroSection.jsx'
import TeamSection from './TeamSection.jsx'
import LeversSection from './LeversSection.jsx'
import GameSection from './GameSection.jsx'
import PackagesSection from './PackagesSection.jsx'
import ValuesSection from './ValuesSection.jsx'
import ModelSection from './ModelSection.jsx'
import FuturesSection from './FuturesSection.jsx'
import ResultsSection from './ResultsSection.jsx'
import ProhibitionSection from './ProhibitionSection.jsx'
import TimingSection from './TimingSection.jsx'
import CaveatsSection from './CaveatsSection.jsx'
import FinaleSection from './FinaleSection.jsx'
import ScoreboardSection from './ScoreboardSection.jsx'
import ThankYouSection from './ThankYouSection.jsx'
import MiniQR from './MiniQR.jsx'
import HandStage from './hand3d/HandStage.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <IntroSection />
      <TeamSection />
      <LeversSection />
      <GameSection />
      <PackagesSection />
      <ValuesSection />
      <ModelSection />
      <FuturesSection />
      <ResultsSection />
      <ProhibitionSection />
      <TimingSection />
      <CaveatsSection />
      <FinaleSection />
      <ScoreboardSection />
      <ThankYouSection />
      <footer className="credits">
        This work is based on{' '}
        <a href="https://sketchfab.com/3d-models/robotic-hand-3e284b06bbb84d858f85f7a246cd65df" target="_blank" rel="noreferrer">
          &ldquo;Robotic Hand&rdquo;
        </a>{' '}
        by{' '}
        <a href="https://sketchfab.com/SeanNicolas" target="_blank" rel="noreferrer">
          SeanNicolas
        </a>{' '}
        licensed under{' '}
        <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC-BY-4.0
        </a>
        .
      </footer>
      <MiniQR />
      <HandStage />
    </>
  )
}
