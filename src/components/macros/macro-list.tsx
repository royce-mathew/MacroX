import React from "react";
import { Play, Edit, Trash2, Download, Upload, FileJson } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Macro } from "../../types/macro";
import { formatDistanceToNow } from "date-fns";

interface MacroListProps {
  macros: Macro[];
  onPlay: (macro: Macro) => void;
  onEdit: (macro: Macro) => void;
  onDelete: (macroId: string) => void;
  onExport: (macro: Macro) => void;
  onImport: () => void;
}

export const MacroList: React.FC<MacroListProps> = ({
  macros,
  onPlay,
  onEdit,
  onDelete,
  onExport,
  onImport,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Macros</h2>
          <p className="text-muted-foreground mt-2">
            Manage and execute your saved macros
          </p>
        </div>
        <Button
          onClick={onImport}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Upload size={18} />
          Import Macro
        </Button>
      </div>

      {macros.length === 0 ? (
        <Card className="text-center py-12">
          <FileJson
            size={64}
            className="mx-auto text-muted-foreground/30 mb-4"
          />
          <h3 className="text-xl font-semibold mb-2">No macros yet</h3>
          <p className="text-muted-foreground mb-6">
            Record your first macro to get started with automation
          </p>
          <Button>Go to Record</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {macros.map((macro) => (
            <Card
              key={macro.id}
              className="hover:shadow-md transition-shadow p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1">{macro.name}</h3>
                  {macro.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {macro.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{macro.events.length} events</span>
                    <span>•</span>
                    <span>
                      Created{" "}
                      {formatDistanceToNow(macro.createdAt, {
                        addSuffix: true,
                      })}
                    </span>
                    {macro.playbackSettings.repeatMode === "infinite" && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">
                          Infinite Loop
                        </span>
                      </>
                    )}
                    {macro.playbackSettings.repeatMode === "count" && (
                      <>
                        <span>•</span>
                        <span className="text-primary font-medium">
                          {macro.playbackSettings.repeatCount}x
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onPlay(macro)}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                    title="Play Macro"
                  >
                    <Play size={20} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(macro)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                    title="Edit Macro"
                  >
                    <Edit size={20} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onExport(macro)}
                    title="Export Macro"
                  >
                    <Download size={20} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(macro.id)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Delete Macro"
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
