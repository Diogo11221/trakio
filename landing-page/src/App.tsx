import { Backdrop } from './components/Backdrop';
import { Grain } from './components/Grain';
import { Nav } from './components/Nav';
import { SmoothScrollProvider } from './hooks/SmoothScroll';
import { Faq } from './sections/Faq';
import { FinalCta } from './sections/FinalCta';
import { Footer } from './sections/Footer';
import { ForTrainers } from './sections/ForTrainers';
import { Pricing } from './sections/Pricing';
import { Showcase } from './sections/Showcase';

export function App() {
  return (
    <SmoothScrollProvider>
      <Backdrop />
      <Nav />
      <main>
        <Showcase />
        <ForTrainers />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <Grain />
    </SmoothScrollProvider>
  );
}
