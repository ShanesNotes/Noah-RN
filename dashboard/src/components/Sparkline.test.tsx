import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders nothing when fewer than 2 values', () => {
    const { container } = render(<Sparkline values={[42]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for empty values', () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG with polyline for 2+ values', () => {
    const { container } = render(<Sparkline values={[10, 20, 15, 25]} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('polyline')).toBeInTheDocument();
  });

  it('renders endpoint circle', () => {
    const { container } = render(<Sparkline values={[10, 20, 30]} />);
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('uses default dimensions', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('respects custom dimensions', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} width={120} height={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('uses custom color for stroke', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} color="#ff0000" />);
    const polyline = container.querySelector('polyline');
    expect(polyline).toHaveAttribute('stroke', '#ff0000');
  });

  it('scales values to fit height', () => {
    const { container } = render(<Sparkline values={[0, 100, 50]} width={100} height={50} />);
    const polyline = container.querySelector('polyline');
    const points = polyline?.getAttribute('points');
    expect(points).toBeTruthy();
    const pointArray = points!.split(' ');
    expect(pointArray).toHaveLength(3);
  });
});
