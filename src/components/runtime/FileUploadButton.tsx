import React, { useRef } from 'react';
import { Paperclip, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileUploadButtonProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUploadButton({
  onFilesSelected,
  disabled = false,
  className = '',
}: FileUploadButtonProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = ''; // Reset to allow selecting the same file again
    }
  };

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={className}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>上传图片或文件</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={handleImageClick} className="cursor-pointer">
            <Image className="mr-2 h-4 w-4" />
            <span>上传图片</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFileClick} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>上传文件</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
