'use client';

import { Puck, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { puckConfig, type PuckData } from './puck/config';

interface PuckEditorProps {
  initialData: PuckData | null;
  onChange: (data: PuckData) => void;
}

const EMPTY_DATA: PuckData = {
  content: [],
  root: { props: {} },
  zones: {},
};

export default function PuckEditor({ initialData, onChange }: PuckEditorProps) {
  return (
    <div style={{ height: '80vh', border: '1px solid #e8e4dc', borderRadius: '12px', overflow: 'hidden' }}>
      <Puck
        config={puckConfig}
        data={(initialData ?? EMPTY_DATA) as unknown as Data}
        onPublish={(data) => onChange(data as PuckData)}
        onChange={(data) => onChange(data as PuckData)}
      />
    </div>
  );
}
