"use client";

import { EllipsisIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { DemoCard, Section } from "./section";

export function Overlays() {
  return (
    <Section id="overlays" number="05" title="A little context">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DemoCard title="Dialog">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              Open dialog
            </DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>A little room to focus</DialogTitle>
                <DialogDescription>
                  This dialog is a local component example.
                </DialogDescription>
              </DialogHeader>
              <DialogPanel>
                <p className="text-sm leading-7 text-muted-foreground">
                  Tab stays inside the dialog. Escape closes it and returns
                  focus to the trigger.
                </p>
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>
                  Cancel
                </DialogClose>
                <DialogClose
                  render={<Button />}
                  onClick={() =>
                    toastManager.add({
                      title: "Example confirmed",
                      type: "success",
                    })
                  }
                >
                  Confirm example
                </DialogClose>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </DemoCard>
        <DemoCard title="Popover">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              Open popover
            </PopoverTrigger>
            <PopoverPopup className="max-w-[calc(100vw-2rem)]">
              <PopoverTitle>Shared interests</PopoverTitle>
              <PopoverDescription>
                Small contextual details belong near the action.
              </PopoverDescription>
              <PopoverClose
                render={<Button variant="ghost" size="sm" />}
                className="mt-3"
              >
                Got it
              </PopoverClose>
            </PopoverPopup>
          </Popover>
        </DemoCard>
        <DemoCard title="Menu">
          <Menu>
            <MenuTrigger render={<Button variant="outline" />}>
              <EllipsisIcon aria-hidden="true" />
              Open menu
            </MenuTrigger>
            <MenuPopup>
              <MenuGroup>
                <MenuGroupLabel>Example actions</MenuGroupLabel>
                <MenuItem
                  onClick={() =>
                    toastManager.add({ title: "Edit example selected" })
                  }
                >
                  Edit<MenuShortcut>⌘ E</MenuShortcut>
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    toastManager.add({ title: "Duplicate example selected" })
                  }
                >
                  Duplicate
                </MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuCheckboxItem defaultChecked>Show archived</MenuCheckboxItem>
            </MenuPopup>
          </Menu>
        </DemoCard>
        <DemoCard title="Tooltip">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>
              <InfoIcon aria-hidden="true" />
              Focus or hover
            </TooltipTrigger>
            <TooltipPopup>Short, non-essential context.</TooltipPopup>
          </Tooltip>
        </DemoCard>
      </div>
      <DemoCard title="Toast notifications">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toastManager.add({ title: "Example saved", type: "success" })
            }
          >
            Show success
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toastManager.add({
                id: "design-system-error",
                title: "Example failed",
                description: "Try the action again.",
                type: "error",
                timeout: 0,
                actionProps: {
                  children: "Dismiss",
                  onClick: () => toastManager.close("design-system-error"),
                },
              })
            }
          >
            Show error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toastManager.add({ title: "Example information", type: "info" })
            }
          >
            Show information
          </Button>
        </div>
      </DemoCard>
    </Section>
  );
}
