import { Grain } from './components/Grain';
import { Nav } from './components/Nav';
import { SmoothScrollProvider } from './hooks/SmoothScroll';
import { Faq } from './sections/Faq';
import { FinalCta } from './sections/FinalCta';
import { Footer } from './sections/Footer';
import { ForTrainers } from './sections/ForTrainers';
import { Hero } from './sections/Hero';
import { Pricing } from './sections/Pricing';
import { ScrollStory } from './sections/ScrollStory';

export function App() {
  return (
    <SmoothScrollProvider>
      <Nav />
      <main>
        <Hero />
        <ScrollStory />
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
