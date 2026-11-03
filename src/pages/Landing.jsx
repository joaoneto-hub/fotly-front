import { motion, useScroll, useSpring } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import ValueStrip from '../components/ValueStrip.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Modes from '../components/Modes.jsx'
import Marquee from '../components/Marquee.jsx'
import DriveSection from '../components/DriveSection.jsx'
import Pricing from '../components/Pricing.jsx'
import FAQ from '../components/FAQ.jsx'
import CTA from '../components/CTA.jsx'
import Footer from '../components/Footer.jsx'

export default function Landing() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />
      <Navbar />
      <main>
        <Hero />
        <ValueStrip />
        <HowItWorks />
        <Modes />
        <Marquee />
        <DriveSection />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
