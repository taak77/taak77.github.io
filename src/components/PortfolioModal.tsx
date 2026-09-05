import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

export interface PortfolioModalItem {
  title: string;
  images: string[];
  imageColumns: 1 | 2;
  tools: string[];
  description: string;
}

interface Props {
  items: PortfolioModalItem[];
}

export default function PortfolioModal({ items }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Open via delegation so the 15 tiles can stay static server-rendered HTML.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const tile = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        '[data-portfolio-index]',
      );
      if (!tile) return;
      triggerRef.current = tile;
      setIndex(Number(tile.dataset.portfolioIndex));
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (index === null) {
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
      triggerRef.current?.focus();
      triggerRef.current = null;
      return;
    }

    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
  }, [index]);

  const close = () => {
    document.body.style.overflow = '';
    setIndex(null);
  };
  const item = index === null ? null : items[index];

  return (
    <dialog
      ref={dialogRef}
      data-portfolio-dialog
      aria-modal="true"
      aria-label={item ? item.title : undefined}
      onCancel={close}
      onClose={close}
      class="m-0 h-full max-h-none w-full max-w-none border-0 bg-white p-0 text-brand-primary backdrop:bg-black/50"
    >
      {item && (
        <div class="relative min-h-full py-[100px] text-center">
          <button
            type="button"
            onClick={close}
            aria-label="Close dialog"
            class="absolute top-[25px] right-[25px] h-[75px] w-[75px] cursor-pointer border-0 bg-transparent hover:opacity-30"
          >
            <span class="relative left-[35px] block h-[75px] w-px rotate-45 bg-brand-primary">
              <span class="block h-[75px] w-px rotate-90 bg-brand-primary"></span>
            </span>
          </button>

          <div class="container">
            <div class="mx-auto md:w-2/3">
              <h2 data-modal-title class="m-0 text-[3em]">
                {item.title}
              </h2>
              <hr class="star-divider star-divider--primary" />

              <div class="flex flex-wrap justify-center">
                {item.images.map((src) => (
                  <div
                    key={src}
                    class={item.imageColumns === 2 ? 'w-full px-[15px] sm:w-1/2' : 'w-full px-[15px]'}
                  >
                    <img
                      data-modal-image
                      src={src}
                      alt=""
                      class="mx-auto mb-[30px] block h-auto max-w-full"
                    />
                  </div>
                ))}
              </div>

              <p data-modal-description>{item.description}</p>

              <ul class="my-[30px] list-none p-0">
                <li>
                  Tools: <strong data-modal-tools>{item.tools.join(', ')}</strong>
                </li>
              </ul>

              <button
                type="button"
                onClick={close}
                class="cursor-pointer border-0 bg-btn-default px-4 py-2 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
