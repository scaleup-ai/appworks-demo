import React from "react";
import Card from "./Card.component";

interface Item {
  title: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

interface Props {
  items: Item[];
  cols?: string; // tailwind grid-cols classes, e.g. "md:grid-cols-2 lg:grid-cols-4"
}

const SummaryCardGrid: React.FC<Props> = ({ items, cols = "md:grid-cols-2 lg:grid-cols-4" }) => {
  return (
    <div className={`grid grid-cols-1 gap-6 ${cols}`}>
      {items.map((it, idx) => (
        <Card key={idx} className={it.className}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{it.title}</p>
              <p className="text-2xl font-bold text-gray-900">{it.value}</p>
            </div>
            {it.icon && (
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">{it.icon}</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SummaryCardGrid;
