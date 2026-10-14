import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../src/components/dialog';
import { Button } from '../src/components/button';
import { Input } from '../src/components/input';

const meta: Meta = {
  title: 'Components/Dialog',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Configure Risk Limit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Risk Limit Policy</DialogTitle>
          <DialogDescription>
            Specify an automated alert trigger threshold for portfolio VaR or concentration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input label="Limit Name" defaultValue="Tech Concentration Limit" />
          <Input label="Threshold (%)" defaultValue="25" helperText="Max allocation per sector" />
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="default">Save Policy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
