"use client";
import { NotLoggedInHome } from '@/components/NotLoggedInHome';
import { usePrivy } from '@privy-io/react-auth';
import Card from '@/components/Card';
import ModalWithCards from '@/components/ModalWithCards';
import { useState } from 'react';


export default function Home() {

  const { ready, authenticated } = usePrivy();
  const SHOW_START_MODAL = true;
  const [isModalOpen, setIsModalOpen] = useState(SHOW_START_MODAL);

  if (ready && !authenticated) {
    return <NotLoggedInHome />;
  }

  const cards = Array.from({ length: 20 }).map((_, index) => ({
    id: index + 1,
    title: `Card ${index + 1}`,
    subtitle: index % 2 === 0 ? 'With image' : 'No image',
    imageSrc: null,
  }));

  const topRow = cards.slice(0, 5);
  const gridCards = cards.slice(5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ModalWithCards
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Unlock Pack"
        cards={topRow}
        actionText="Continue"
        onAction={() => setIsModalOpen(false)}
      />
      <section className="mb-6 flex flex-col h-[440px] bg-[#BDBDBD] rounded-[24px] p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Deck</h2>
        </div>
        <div className="-mx-4 overflow-x-auto pb-2 flex-1 h-full">
          <div className="mx-4 flex gap-4">
            {topRow.map((item) => (
              <Card key={item.id} title={item.title} subtitle={item.subtitle} imageSrc={item.imageSrc} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {gridCards.map((item) => (
            <Card
              key={item.id}
              className="w-[183px] h-[220px]"
              title={item.title}
              subtitle={item.subtitle}
              imageSrc={item.imageSrc} />
          ))}
        </div>
      </section>
    </div>
  );
}