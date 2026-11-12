import type {Metadata} from 'next';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import {Providers} from './providers';

export const metadata: Metadata = {
  title: 'Adaptive Music',
  description: 'Image-to-music playlists and personal streaming.',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
